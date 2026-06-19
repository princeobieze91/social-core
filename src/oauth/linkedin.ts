// LinkedIn OAuth: code exchange, token storage, org page discovery
import { createChannel } from '../db';

const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';

export function getLinkedInAuthUrl(workspaceId: string, redirectUri: string): string {
  const scopes = ['w_member_social', 'w_organization_social', 'r_organization_social', 'r_liteprofile', 'r_emailaddress'].join(' ');
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId, platform: 'linkedin' })).toString('base64url');

  return `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${LI_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}`;
}

export async function handleLinkedInCallback(code: string, workspaceId: string, redirectUri: string) {
  // Step 1: Exchange code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: LI_CLIENT_ID,
      client_secret: LI_CLIENT_SECRET
    })
  });
  const tokenData = await tokenRes.json() as any;
  if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
  const accessToken = tokenData.access_token;

  // Step 2: Get member profile
  const meRes = await fetch('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meData = await meRes.json() as any;
  const profileName = `${meData.localizedFirstName || ''} ${meData.localizedLastName || ''}`.trim() || 'LinkedIn User';

  // Store member channel
  const memberChannel = await createChannel({
    workspace_id: workspaceId,
    platform: 'linkedin',
    access_token: accessToken,
    platform_user_id: meData.id,
    profile_name: profileName
  });

  const channels = [memberChannel];

  // Step 3: Get organizations (company pages) the user manages
  try {
    const orgsRes = await fetch('https://api.linkedin.com/v2/organizationalRoleAcls?q=viewer', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    const orgsData = await orgsRes.json() as any;
    const orgs = orgsData.elements || [];

    for (const org of orgs) {
      if (org.organizationalTarget && org.role === 'ADMINISTRATOR') {
        const orgChannel = await createChannel({
          workspace_id: workspaceId,
          platform: 'linkedin',
          access_token: accessToken,
          platform_user_id: meData.id,
          profile_name: profileName,
          org_id: org.organizationalTarget
        });
        channels.push(orgChannel);
      }
    }
  } catch {
    // May not have org access, that's fine
  }

  return { channels, user: meData };
}
