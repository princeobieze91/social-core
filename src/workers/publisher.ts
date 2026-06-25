// Social Platform Publisher: translates posts into platform-specific API payloads
import { getChannelById } from '../db';

export interface PublishResult {
  success: boolean;
  native_post_id?: string;
  error?: string;
}

export async function publishViaMakeWebhook(channelId: string, text: string, mediaUrls?: string[]): Promise<PublishResult> {
  const channel = await getChannelById(channelId);
  if (!channel) return { success: false, error: 'Channel not found' };

  const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
  if (!MAKE_WEBHOOK_URL) {
    return { success: false, error: 'Make.com webhook URL not configured' };
  }

  try {
    const payload = {
      content: text,
      mediaUrls: mediaUrls || [],
      identifier: channel.page_id || channel.platform_user_id,
      platform: channel.platform
    };

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Make.com webhook failed: ${res.status} ${errorText}` };
    }

    return { success: true, native_post_id: `make-${Date.now()}-${channelId}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function publishToLinkedIn(channelId: string, text: string, mediaUrls?: string[]): Promise<PublishResult> {
  const channel = await getChannelById(channelId);
  if (!channel) return { success: false, error: 'Channel not found' };

  try {
    const author = channel.org_id
      ? `urn:li:organization:${channel.org_id}`
      : `urn:li:person:${channel.platform_user_id}`;

    const payload: any = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: mediaUrls && mediaUrls.length > 0 ? 'ARTICLE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // Add media if present
    if (mediaUrls && mediaUrls.length > 0) {
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map(url => ({
        status: 'READY',
        media: url
      }));
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channel.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json() as any;

    if (data.status && data.status >= 400) {
      return { success: false, error: data.message || 'LinkedIn API error' };
    }

    return { success: true, native_post_id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Platform Router ──────────────────────────────────────────

export async function publishPost(channelId: string, platform: string, text: string, mediaUrls?: string[]): Promise<PublishResult> {
  switch (platform) {
    case 'facebook':
      return publishViaMakeWebhook(channelId, text, mediaUrls);
    case 'instagram':
      return publishViaMakeWebhook(channelId, text, mediaUrls);
    case 'linkedin':
      return publishToLinkedIn(channelId, text, mediaUrls);
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}