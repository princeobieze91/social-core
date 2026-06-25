// BullMQ Queue + Worker: async post publishing
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import {
  getPostById,
  getWorkspaceChannels,
  markPostPublishing,
  markPostPublished,
  markPostFailed,
  addPostLog,
  updatePost
} from '../db';
import { publishPost } from './publisher';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection: any = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

connection.on('error', () => {});

// ─── Queue ────────────────────────────────────────────────────

export const publishQueue = new Queue('publish-posts', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // Start with 60s retry delay
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 }
  }
});

// ─── Worker ───────────────────────────────────────────────────

export const publishWorker = new Worker(
  'publish-posts',
  async (job: Job) => {
    const { postId } = job.data;
    console.log(`[Worker] Processing post: ${postId}`);

    const post = await getPostById(postId);
    if (!post) {
      console.error(`[Worker] Post ${postId} not found, skipping`);
      return { status: 'skipped', reason: 'post_not_found' };
    }

    if (post.status !== 'publishing') {
      console.log(`[Worker] Post ${postId} status is "${post.status}", skipping`);
      return { status: 'skipped', reason: 'wrong_status' };
    }

    // Get channels for this workspace that match the post's platforms
    const channels = await getWorkspaceChannels(post.workspace_id);
    const results: any[] = [];

    for (const platform of post.platforms) {
      const channel = channels.find((c: any) => c.platform === platform);
      if (!channel) {
        results.push({ platform, success: false, error: 'No connected channel for this platform' });
        continue;
      }

      // Try to publish
      let result = await publishPost(channel.id, platform, post.content);


      results.push({ platform, ...result });
    }

    // Determine overall status
    const allFailed = results.every(r => !r.success);
    const anyFailed = results.some(r => !r.success);
    const anySuccess = results.some(r => r.success);

    if (allFailed) {
      const errorMsg = results.map(r => `${r.platform}: ${r.error}`).join('; ');
      await markPostFailed(postId, errorMsg, post.retry_count + 1);
      await addPostLog(post.workspace_id, 'System', 'system', `Publication failed: ${errorMsg}`);
      throw new Error(errorMsg); // BullMQ will retry
    }

    if (anySuccess) {
      await markPostPublished(postId);
      await addPostLog(post.workspace_id, 'System', 'system', `Published to: ${results.filter(r => r.success).map(r => r.platform).join(', ')}`);
    }

    if (anyFailed) {
      await updatePost(postId, {
        error_message: results.filter(r => !r.success).map(r => `${r.platform}: ${r.error}`).join('; ')
      });
    }

    return { status: 'completed', results };
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000 // Max 10 publishes per minute (rate limit safety)
    }
  }
);

publishWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed for post ${job.data.postId}`);
});

publishWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed for post ${job?.data?.postId}:`, err.message);
});

// ─── Enqueue Helper ───────────────────────────────────────────

export async function enqueuePost(postId: string) {
  await markPostPublishing(postId);
  const job = await publishQueue.add('publish', { postId }, { jobId: postId });
  console.log(`[Queue] Enqueued post ${postId} as job ${job.id}`);
  return job;
}

// ─── Graceful Shutdown ────────────────────────────────────────

export async function shutdownWorker() {
  await publishWorker.close();
  await publishQueue.close();
  await connection.quit();
}
