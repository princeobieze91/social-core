// src/db.ts
import { supabase } from './supabaseClient';

const avatarImageIdentifiers = [
  '1535713875002-d1d0cf377fde',
  '1494790108377-be9c29b29330',
  '1507003211169-0a1dd7228f2d',
  '1544005313-94ddf0286df2',
  '1438761681033-6461ffad8d80',
  '1500648767791-00dcc994a43e',
  '1534528741775-53994a69daeb',
  '1573496359142-b8d87734a5a2'
];

function getRandomAvatarUrl(): string {
  const randomIndex = Math.floor(Math.random() * avatarImageIdentifiers.length);
  const randomIdentifier = avatarImageIdentifiers[randomIndex];
  return `https://images.unsplash.com/photo-${randomIdentifier}?auto=format&fit=crop&q=80&w=150`;
}

// ─── User Auth ────────────────────────────────────────────────

export async function createUser(name: string, email: string, password: string, role: string = "Contributor"): Promise<any | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          role: role,
          avatarUrl: getRandomAvatarUrl()
        }
      }
    });

    if (authError) {
      console.error('Supabase Auth Error:', authError.message);
      if (authError.message.includes('already registered')) {
        const existingUser = await findUserByEmail(email);
        if (existingUser) return existingUser;
      }
      throw authError;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user?.id,
        name: name,
        email: email,
        role: role,
        avatarUrl: authData.user?.user_metadata?.avatarUrl
      }])
      .select();

    if (profileError) {
      console.error('Supabase Profile Error:', profileError.message);
      throw profileError;
    }

    return userProfile ? userProfile[0] : null;
  } catch (error: any) {
    console.error('Error creating user:', error.message);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    console.error('Error finding user by email:', error.message);
    return null;
  }
}

export async function findUserById(id: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    console.error('Error finding user by id:', error.message);
    return null;
  }
}

// ─── Workspaces ───────────────────────────────────────────────

export async function createWorkspace(name: string, userId: string, logo?: string, description?: string) {
  const { data, error } = await supabase
    .from('workspaces')
    .insert([{
      name,
      logo: logo || '🚀',
      description: description || '',
      created_by: userId
    }])
    .select()
    .single();

  if (error) throw error;

  // Auto-add creator as admin member
  await supabase
    .from('workspace_members')
    .insert([{
      workspace_id: data.id,
      user_id: userId,
      role: 'admin'
    }]);

  return data;
}

export async function getUserWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspaces(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map((m: any) => ({ ...m.workspaces, role: m.role }));
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: string = 'contributor') {
  const { data, error } = await supabase
    .from('workspace_members')
    .upsert([{
      workspace_id: workspaceId,
      user_id: userId,
      role
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkspaceMembers(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, users:user_id(id, name, email, avatarUrl, role)')
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data;
}

export async function isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
}

// ─── Connected Channels ───────────────────────────────────────

export async function createChannel(channel: {
  workspace_id: string;
  platform: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;
  platform_user_id: string;
  profile_name: string;
  profile_image_url?: string;
  page_id?: string;
  org_id?: string;
}) {
  const { data, error } = await supabase
    .from('connected_channels')
    .insert([channel])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWorkspaceChannels(workspaceId: string) {
  const { data, error } = await supabase
    .from('connected_channels')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getChannelById(channelId: string) {
  const { data, error } = await supabase
    .from('connected_channels')
    .select('*')
    .eq('id', channelId)
    .single();

  if (error) return null;
  return data;
}

export async function deleteChannel(channelId: string) {
  const { error } = await supabase
    .from('connected_channels')
    .delete()
    .eq('id', channelId);

  if (error) throw error;
}

export async function updateChannelToken(channelId: string, accessToken: string, tokenExpiry?: string) {
  const updates: any = { access_token: accessToken, updated_at: new Date().toISOString() };
  if (tokenExpiry) updates.token_expiry = tokenExpiry;

  const { error } = await supabase
    .from('connected_channels')
    .update(updates)
    .eq('id', channelId);

  if (error) throw error;
}

// ─── Scheduled Posts ──────────────────────────────────────────

export async function createPost(post: {
  workspace_id: string;
  title: string;
  content: string;
  platforms: string[];
  status?: string;
  scheduled_at?: string;
  created_by: string;
  attachments?: any[];
}) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert([{
      workspace_id: post.workspace_id,
      title: post.title,
      content: post.content,
      platforms: post.platforms,
      status: post.status || 'draft',
      scheduled_at: post.scheduled_at,
      created_by: post.created_by
    }])
    .select()
    .single();

  if (error) throw error;

  // Insert attachments if any
  if (post.attachments && post.attachments.length > 0) {
    const attachments = post.attachments.map((a: any) => ({
      post_id: data.id,
      url: a.url,
      type: a.type,
      name: a.name,
      size: a.size
    }));

    await supabase.from('post_attachments').insert(attachments);
  }

  // Insert initial log
  await supabase.from('post_logs').insert([{
    post_id: data.id,
    user_name: 'System',
    user_role: 'system',
    action: 'Post created'
  }]);

  return data;
}

export async function getWorkspacePosts(workspaceId: string) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      attachments:post_attachments(*),
      comments:post_comments(*),
      logs:post_logs(*)
    `)
    .eq('workspace_id', workspaceId)
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPostById(postId: string) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      attachments:post_attachments(*),
      comments:post_comments(*),
      logs:post_logs(*)
    `)
    .eq('id', postId)
    .single();

  if (error) return null;
  return data;
}

export async function updatePost(postId: string, updates: {
  title?: string;
  content?: string;
  platforms?: string[];
  status?: string;
  scheduled_at?: string;
  error_message?: string;
  retry_count?: number;
  published_at?: string;
}) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string) {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

// ─── Post Comments ────────────────────────────────────────────

export async function addPostComment(postId: string, comment: {
  author_id: string;
  author_name: string;
  author_role?: string;
  author_avatar_url?: string;
  is_ai?: boolean;
  persona?: string;
  text: string;
  suggestions?: string[];
}) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert([{ post_id: postId, ...comment }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Post Logs ────────────────────────────────────────────────

export async function addPostLog(postId: string, userName: string, userRole: string, action: string) {
  const { data, error } = await supabase
    .from('post_logs')
    .insert([{
      post_id: postId,
      user_name: userName,
      user_role: userRole,
      action
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Scheduler Queries ────────────────────────────────────────

export async function getDuePosts() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, workspace_id, platforms')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  if (error) throw error;
  return data || [];
}

export async function markPostPublishing(postId: string) {
  const { error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('status', 'scheduled'); // Atomic: only if still scheduled

  if (error) throw error;
}

export async function markPostPublished(postId: string, nativePostId?: string) {
  const updates: any = {
    status: 'published',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase
    .from('scheduled_posts')
    .update(updates)
    .eq('id', postId);

  if (error) throw error;
}

export async function markPostFailed(postId: string, errorMessage: string, retryCount: number) {
  const { error } = await supabase
    .from('scheduled_posts')
    .update({
      status: retryCount >= 3 ? 'failed' : 'scheduled',
      error_message: errorMessage,
      retry_count: retryCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw error;
}

export async function getExpiringChannels() {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('connected_channels')
    .select('id, platform, access_token, refresh_token, token_expiry')
    .eq('is_active', true)
    .not('token_expiry', 'is', null)
    .lt('token_expiry', sevenDaysFromNow);

  if (error) throw error;
  return data || [];
}
