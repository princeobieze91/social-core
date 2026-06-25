import { SocialPost, PostComment, PostAttachment } from "./types";

const API_BASE = "";

function getToken(): string | null {
  return localStorage.getItem("socialcore_auth_token");
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `API request failed: ${res.status}`);
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  return apiRequest<{ user: any; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(name: string, email: string, password: string, role?: string) {
  return apiRequest<{ user: any; token: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function apiGetMe() {
  return apiRequest<{ user: any }>("/api/auth/me");
}

export async function apiOAuthLogin(name: string, email: string, avatarUrl: string, provider: string) {
  return apiRequest<{ user: any; token: string }>("/api/auth/oauth", {
    method: "POST",
    body: JSON.stringify({ name, email, avatarUrl, provider }),
  });
}

export async function apiAuth0Login(idToken: string) {
  return apiRequest<{ user: any; token: string }>("/api/auth/auth0", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

// ─── Workspaces ───────────────────────────────────────────────

export async function apiGetWorkspaces() {
  return apiRequest<{ workspaces: any[] }>("/api/workspaces");
}

export async function apiGetWorkspaceMembers(workspaceId: string) {
  return apiRequest<{ members: any[] }>(`/api/workspaces/${workspaceId}/members`);
}

export async function apiCreateWorkspace(name: string, logo?: string, description?: string) {
  return apiRequest<{ workspace: any }>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, logo, description }),
  });
}

// ─── Channels ─────────────────────────────────────────────────

export async function apiGetChannels(workspaceId: string) {
  return apiRequest<{ channels: any[] }>(`/api/workspaces/${workspaceId}/channels`);
}

export async function apiDeleteChannel(channelId: string) {
  return apiRequest<{ success: boolean }>(`/api/channels/${channelId}`, {
    method: "DELETE",
  });
}

// ─── Posts ────────────────────────────────────────────────────

export async function apiGetPosts(workspaceId: string) {
  return apiRequest<{ posts: any[] }>(`/api/workspaces/${workspaceId}/posts`);
}

export async function apiGetPost(postId: string) {
  return apiRequest<{ post: any }>(`/api/posts/${postId}`);
}

export async function apiCreatePost(
  workspaceId: string,
  post: {
    title: string;
    content: string;
    platforms: string[];
    status?: string;
    scheduled_at?: string;
    attachments?: PostAttachment[];
  }
) {
  return apiRequest<{ post: any }>(`/api/workspaces/${workspaceId}/posts`, {
    method: "POST",
    body: JSON.stringify(post),
  });
}

export async function apiUpdatePost(
  postId: string,
  updates: {
    title?: string;
    content?: string;
    platforms?: string[];
    status?: string;
    scheduled_at?: string;
  }
) {
  return apiRequest<{ post: any }>(`/api/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiDeletePost(postId: string) {
  return apiRequest<{ success: boolean }>(`/api/posts/${postId}`, {
    method: "DELETE",
  });
}

// ─── Comments ─────────────────────────────────────────────────

export async function apiAddComment(
  postId: string,
  comment: {
    text: string;
    is_ai?: boolean;
    persona?: string;
    author_name?: string;
    author_role?: string;
    author_avatar_url?: string;
    suggestions?: string[];
  }
) {
  return apiRequest<{ comment: PostComment }>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(comment),
  });
}

// ─── Status & Logs ────────────────────────────────────────────

export async function apiUpdatePostStatus(postId: string, status: string) {
  return apiRequest<{ success: boolean }>(`/api/posts/${postId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function apiGetPostLogs(postId: string) {
  return apiRequest<{ logs: any[] }>(`/api/posts/${postId}/logs`);
}

// ─── Publishing ───────────────────────────────────────────────

export async function apiPublishPost(postId: string) {
  return apiRequest<{ success: boolean; results: any[] }>(`/api/posts/${postId}/publish`, {
    method: "POST",
  });
}

export async function apiScheduleAndQueue(postId: string, scheduled_at: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/posts/${postId}/schedule-and-queue`, {
    method: "POST",
    body: JSON.stringify({ scheduled_at }),
  });
}

