// Scheduler: periodic scan for due posts, enqueues them for publishing
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getDuePosts, addPostLog } from '../db';
import { publishQueue } from './queue';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection: any = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

connection.on('error', () => {});

const SCANNER_INTERVAL = 60000; // 60 seconds

let scanTimer: NodeJS.Timeout | null = null;

export async function startScheduler() {
  console.log('[Scheduler] Starting periodic post scanner...');

  const scan = async () => {
    try {
      const duePosts = await getDuePosts();
      if (duePosts.length === 0) return;

      console.log(`[Scheduler] Found ${duePosts.length} due posts`);

      for (const post of duePosts) {
        try {
          // Check if already queued (prevent duplicates)
          const existingJob = await publishQueue.getJob(post.id);
          if (existingJob) {
            const state = await existingJob.getState();
            if (state === 'active' || state === 'waiting' || state === 'delayed') {
              console.log(`[Scheduler] Post ${post.id} already in queue (state: ${state}), skipping`);
              continue;
            }
          }

          await publishQueue.add('publish', { postId: post.id }, { jobId: post.id });
          console.log(`[Scheduler] Enqueued post ${post.id}`);
        } catch (err: any) {
          console.error(`[Scheduler] Failed to enqueue post ${post.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] Scan error:', err.message);
    }
  };

  // Initial scan
  await scan();

  // Periodic scan
  scanTimer = setInterval(scan, SCANNER_INTERVAL);
  console.log(`[Scheduler] Scanner running every ${SCANNER_INTERVAL / 1000}s`);
}

export function stopScheduler() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
  connection.quit();
  console.log('[Scheduler] Stopped');
}
