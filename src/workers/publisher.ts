// Social Platform Publisher: translates posts into platform-specific API payloads
import { getChannelById } from '../db';

const FB_API_VERSION = 'v19.0';
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

export interface PublishResult {
  success: boolean;
  native_post_id?: string;
  error?: string;
}

export async function publishToFacebook(channelId: string, text: string, mediaUrls?: string[]): Promise<PublishResult> {
  const channel = await getChannelById(channelId);
  if (!channel) return { success: false, error: 'Channel not found' };
  if (!channel.page_id) return { success: false, error: 'No page ID configured for this channel' };

  try {
    const url = `${FB_BASE}/${channel.page_id}/feed`;
    const payload: any = {
      message: text,
      access_token: channel.access_token
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json() as any;

    if (data.error) {
      return { success: false, error: data.error.message || 'Facebook API error' };
    }

    return { success: true, native_post_id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishToInstagram(channelId: string, text: string, mediaUrls?: string[]): Promise<PublishResult> {
  const channel = await getChannelById(channelId);
  if (!channel) return { success: false, error: 'Channel not found' };

  if (!mediaUrls || mediaUrls.length === 0) {
    return { success: false, error: 'Instagram requires at least one media attachment' };
  }

  try {
    // Step 1: Create media container
    const containerRes = await fetch(
      `${FB_BASE}/${channel.page_id || 'me'}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrls[0],
          caption: text,
          access_token: channel.access_token
        })
      }
    );
    const containerData = await containerRes.json() as any;
    if (containerData.error) {
      return { success: false, error: containerData.error.message };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `${FB_BASE}/${channel.page_id || 'me'}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: channel.access_token
        })
      }
    );
    const publishData = await publishRes.json() as any;
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, native_post_id: publishData.id };
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
      return publishToFacebook(channelId, text, mediaUrls);
    case 'instagram':
      return publishToInstagram(channelId, text, mediaUrls);
    case 'linkedin':
      return publishToLinkedIn(channelId, text, mediaUrls);
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}