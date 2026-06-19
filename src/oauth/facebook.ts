// Facebook OAuth: code exchange, long-lived token, page discovery
import { createChannel, getChannelById, updateChannelToken } from '../db';

const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FB_API_VERSION = 'v19.0';
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

export function getFacebookAuthUrl(workspaceId: string, redirectUri: string): string {
  const scopes = [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
    'instagram_basic',
    'instagram_content_publish',
    'public_profile',
    'email'
  ].join(',');

  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId, platform: 'facebook' })).toString('base64url');

  return `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth` +
    `?client_id=${FB_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&response_type=code` +
    `&state=${state}`;
}

export async function handleFacebookCallback(code: string, workspaceId: string, redirectUri: string) {
  // Step 1: Exchange code for short-lived user token
  const tokenRes = await fetch(
    `${FB_BASE}/oauth/access_token?` +
    `client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
  );
  const tokenData = await tokenRes.json() as any;
  if (tokenData.error) throw new Error(tokenData.error.message);
  const shortToken = tokenData.access_token;

  // Step 2: Exchange for long-lived user token (60 days)
  const llRes = await fetch(
    `${FB_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${FB_APP_ID}` +
    `&client_secret=${FB_APP_SECRET}&fb_exchange_token=${shortToken}`
  );
  const llData = await llRes.json() as any;
  if (llData.error) throw new Error(llData.error.message);
  const longToken = llData.access_token;

  // Step 3: Get user info
  const meRes = await fetch(`${FB_BASE}/me?fields=id,name,email&access_token=${longToken}`);
  const meData = await meRes.json() as any;

  // Step 4: Get pages managed by user
  const pagesRes = await fetch(`${FB_BASE}/me/accounts?fields=id,name,access_token&access_token=${longToken}`);
  const pagesData = await pagesRes.json() as any;
  const pages = pagesData.data || [];

  // Step 5: Store each page as a connected channel
  const channels = [];
  for (const page of pages) {
    // Page tokens from /me/accounts are already long-lived
    const channel = await createChannel({
      workspace_id: workspaceId,
      platform: 'facebook',
      access_token: page.access_token || longToken,
      platform_user_id: meData.id,
      profile_name: page.name,
      page_id: page.id
    });
    channels.push(channel);

    // Check for Instagram business account on this page
    try {
      const igRes = await fetch(
        `${FB_BASE}/${page.id}?fields=instagram_business_account{id,name}&access_token=${page.access_token || longToken}`
      );
      const igData = await igRes.json() as any;
      if (igData.instagram_business_account) {
        const igChannel = await createChannel({
          workspace_id: workspaceId,
          platform: 'instagram',
          access_token: page.access_token || longToken,
          platform_user_id: igData.instagram_business_account.id,
          profile_name: igData.instagram_business_account.name || page.name,
          page_id: page.id
        });
        channels.push(igChannel);
      }
    } catch {
      // Page may not have IG connected, that's fine
    }
  }

  return { channels, user: meData };
}

// ─── Token Refresh ────────────────────────────────────────────

export async function refreshFacebookToken(channelId: string): Promise<string | null> {
  const channel = await getChannelById(channelId);
  if (!channel || channel.platform !== 'facebook') return null;

  try {
    const res = await fetch(
      `${FB_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}&fb_exchange_token=${channel.access_token}`
    );
    const data = await res.json() as any;
    if (data.access_token) {
      const expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      await updateChannelToken(channelId, data.access_token, expiry);
      return data.access_token;
    }
  } catch (err: any) {
    console.error('Facebook token refresh failed:', err.message);
  }
  return null;
}
