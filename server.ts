import path from "path";
import crypto from "crypto";

import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  findUserById,
  createWorkspace,
  getUserWorkspaces,
  addWorkspaceMember,
  getWorkspaceMembers,
  isWorkspaceMember,
  createChannel,
  getWorkspaceChannels,
  getChannelById,
  deleteChannel,
  createPost,
  getWorkspacePosts,
  getPostById,
  updatePost,
  deletePost,
  addPostComment,
  addPostLog,
  getDuePosts,
  markPostPublishing,
  markPostPublished,
  markPostFailed,
} from "./src/db";
import { getFacebookAuthUrl, handleFacebookCallback } from "./src/oauth/facebook";
import { getLinkedInAuthUrl, handleLinkedInCallback } from "./src/oauth/linkedin";

const JWT_SECRET = process.env.JWT_SECRET || "socialcore-jwt-secret-dev-only";
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || "";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const app = express();
const PORT = 3000;

app.use(express.json());

// ─── Lazy Gemini Client ───────────────────────────────────────

let generatorai: any = null;
function getGeminiClient() {
  if (!generatorai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please add it via Secrets panel.");
    }
    generatorai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" },
      },
    });
  }
  return generatorai;
}

// ─── Auth Middleware ───────────────────────────────────────────

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────

app.post("/api/auth/register", async (req: express.Request, res: express.Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    const existing = await findUserByEmail(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(name, email.toLowerCase(), hashedPassword, role || "Contributor");
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ user, token });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});

app.post("/api/auth/login", async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

app.post("/api/auth/oauth", async (req: express.Request, res: express.Response) => {
  try {
    const { name, email, avatarUrl, provider } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    let user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      const bcryptPassword = await bcrypt.hash("oauth-" + provider + "-" + email, 10);
      user = await createUser(name, email.toLowerCase(), bcryptPassword, "Manager");
    }
    if (!user) {
      res.status(500).json({ error: "Failed to create or find user" });
      return;
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error: any) {
    console.error("OAuth error:", error);
    res.status(500).json({ error: error.message || "OAuth authentication failed" });
  }
});

app.post("/api/auth/auth0", async (req: express.Request, res: express.Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: "ID token is required" });
      return;
    }
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      res.status(400).json({ error: "Invalid token format" });
      return;
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (AUTH0_DOMAIN && payload.iss !== `https://${AUTH0_DOMAIN}/`) {
      res.status(401).json({ error: "Invalid token issuer" });
      return;
    }
    if (AUTH0_CLIENT_ID && payload.aud !== AUTH0_CLIENT_ID && !(Array.isArray(payload.aud) && payload.aud.includes(AUTH0_CLIENT_ID))) {
      res.status(401).json({ error: "Invalid token audience" });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      res.status(401).json({ error: "Token expired" });
      return;
    }
    const email = payload.email || "";
    const name = payload.name || payload.nickname || email.split("@")[0] || "Auth0 User";
    let user = await findUserByEmail(email.toLowerCase());
    if (!user) {
      const bcryptPassword = await bcrypt.hash("auth0-" + email, 10);
      user = await createUser(name, email.toLowerCase(), bcryptPassword, "Manager");
    }
    if (!user) {
      res.status(500).json({ error: "Failed to create or find user" });
      return;
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error: any) {
    console.error("Auth0 error:", error);
    res.status(500).json({ error: error.message || "Auth0 authentication failed" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const user = await findUserById((req as any).userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: error.message || "Failed to get user" });
  }
});

// ─── WORKSPACE ROUTES ─────────────────────────────────────────

app.get("/api/workspaces", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const workspaces = await getUserWorkspaces(userId);
    res.json({ workspaces });
  } catch (error: any) {
    console.error("Get workspaces error:", error);
    res.status(500).json({ error: error.message || "Failed to get workspaces" });
  }
});

app.post("/api/workspaces", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { name, logo, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Workspace name is required" });
      return;
    }
    const workspace = await createWorkspace(name, userId, logo, description);
    res.status(201).json({ workspace });
  } catch (error: any) {
    console.error("Create workspace error:", error);
    res.status(500).json({ error: error.message || "Failed to create workspace" });
  }
});

app.get("/api/workspaces/:id/members", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const members = await getWorkspaceMembers(req.params.id);
    res.json({ members });
  } catch (error: any) {
    console.error("Get members error:", error);
    res.status(500).json({ error: error.message || "Failed to get members" });
  }
});

app.post("/api/workspaces/:id/members", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { userId, role } = req.body;
    const member = await addWorkspaceMember(req.params.id, userId, role);
    res.status(201).json({ member });
  } catch (error: any) {
    console.error("Add member error:", error);
    res.status(500).json({ error: error.message || "Failed to add member" });
  }
});

// ─── CHANNEL ROUTES ───────────────────────────────────────────

app.get("/api/workspaces/:workspaceId/channels", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const channels = await getWorkspaceChannels(req.params.workspaceId);
    res.json({ channels });
  } catch (error: any) {
    console.error("Get channels error:", error);
    res.status(500).json({ error: error.message || "Failed to get channels" });
  }
});

app.delete("/api/channels/:id", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    await deleteChannel(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete channel error:", error);
    res.status(500).json({ error: error.message || "Failed to delete channel" });
  }
});

// ─── OAUTH CHANNEL CONNECTION ─────────────────────────────────

app.get("/api/oauth/facebook/auth", authMiddleware, (req: express.Request, res: express.Response) => {
  const workspaceId = req.query.workspace_id as string;
  if (!workspaceId) {
    res.status(400).json({ error: "workspace_id query parameter is required" });
    return;
  }
  const redirectUri = `${APP_URL}/api/oauth/facebook/callback`;
  const url = getFacebookAuthUrl(workspaceId, redirectUri);
  res.redirect(url);
});

app.get("/api/oauth/facebook/callback", async (req: express.Request, res: express.Response) => {
  try {
    const code = req.query.code as string;
    const stateRaw = req.query.state as string;
    if (!code || !stateRaw) {
      res.status(400).send("Missing code or state parameter");
      return;
    }
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    const redirectUri = `${APP_URL}/api/oauth/facebook/callback`;
    await handleFacebookCallback(code, state.workspace_id, redirectUri);
    res.redirect(`${APP_URL}?oauth_success=facebook`);
  } catch (error: any) {
    console.error("Facebook OAuth callback error:", error);
    res.redirect(`${APP_URL}?oauth_error=${encodeURIComponent(error.message)}`);
  }
});

app.get("/api/oauth/linkedin/auth", authMiddleware, (req: express.Request, res: express.Response) => {
  const workspaceId = req.query.workspace_id as string;
  if (!workspaceId) {
    res.status(400).json({ error: "workspace_id query parameter is required" });
    return;
  }
  const redirectUri = `${APP_URL}/api/oauth/linkedin/callback`;
  const url = getLinkedInAuthUrl(workspaceId, redirectUri);
  res.redirect(url);
});

app.get("/api/oauth/linkedin/callback", async (req: express.Request, res: express.Response) => {
  try {
    const code = req.query.code as string;
    const stateRaw = req.query.state as string;
    if (!code || !stateRaw) {
      res.status(400).send("Missing code or state parameter");
      return;
    }
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    const redirectUri = `${APP_URL}/api/oauth/linkedin/callback`;
    await handleLinkedInCallback(code, state.workspace_id, redirectUri);
    res.redirect(`${APP_URL}?oauth_success=linkedin`);
  } catch (error: any) {
    console.error("LinkedIn OAuth callback error:", error);
    res.redirect(`${APP_URL}?oauth_error=${encodeURIComponent(error.message)}`);
  }
});

// ─── POST CRUD ROUTES ─────────────────────────────────────────

app.get("/api/workspaces/:workspaceId/posts", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const posts = await getWorkspacePosts(req.params.workspaceId);
    res.json({ posts });
  } catch (error: any) {
    console.error("Get posts error:", error);
    res.status(500).json({ error: error.message || "Failed to get posts" });
  }
});

app.get("/api/posts/:id", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const post = await getPostById(req.params.id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json({ post });
  } catch (error: any) {
    console.error("Get post error:", error);
    res.status(500).json({ error: error.message || "Failed to get post" });
  }
});

app.post("/api/workspaces/:workspaceId/posts", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { title, content, platforms, status, scheduled_at, attachments } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "Title and content are required" });
      return;
    }
    const post = await createPost({
      workspace_id: req.params.workspaceId,
      title,
      content,
      platforms: platforms || ["facebook"],
      status: status || "draft",
      scheduled_at,
      created_by: userId,
      attachments,
    });
    res.status(201).json({ post });
  } catch (error: any) {
    console.error("Create post error:", error);
    res.status(500).json({ error: error.message || "Failed to create post" });
  }
});

app.put("/api/posts/:id", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { title, content, platforms, status, scheduled_at, error_message, retry_count, published_at } = req.body;
    const post = await updatePost(req.params.id, {
      title,
      content,
      platforms,
      status,
      scheduled_at,
      error_message,
      retry_count,
      published_at,
    });
    res.json({ post });
  } catch (error: any) {
    console.error("Update post error:", error);
    res.status(500).json({ error: error.message || "Failed to update post" });
  }
});

app.delete("/api/posts/:id", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    await deletePost(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: error.message || "Failed to delete post" });
  }
});

// ─── POST COMMENTS ROUTES ─────────────────────────────────────

app.post("/api/posts/:postId/comments", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { text, is_ai, persona, author_name, author_role, author_avatar_url, suggestions } = req.body;
    if (!text) {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }

    let authorInfo: any = {};
    if (is_ai) {
      authorInfo = {
        author_id: `ai-${persona || "unknown"}`,
        author_name: author_name || "AI Reviewer",
        author_role: author_role || "AI Expert",
        author_avatar_url: author_avatar_url || "",
        is_ai: true,
        persona,
      };
    } else {
      const user = await findUserById(userId);
      authorInfo = {
        author_id: userId,
        author_name: user?.name || "Unknown User",
        author_role: user?.role || "Contributor",
        author_avatar_url: user?.avatarUrl || "",
        is_ai: false,
      };
    }

    const comment = await addPostComment(req.params.postId, {
      ...authorInfo,
      text,
      suggestions,
    });

    await addPostLog(req.params.postId, authorInfo.author_name, authorInfo.author_role, "Added comment");

    res.status(201).json({ comment });
  } catch (error: any) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: error.message || "Failed to add comment" });
  }
});

// ─── POST STATUS / LOG ROUTES ─────────────────────────────────

app.put("/api/posts/:postId/status", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const userId = (req as any).userId;
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }
    const user = await findUserById(userId);
    await updatePost(req.params.postId, { status });
    await addPostLog(
      req.params.postId,
      user?.name || "Unknown",
      user?.role || "Contributor",
      `Changed status to ${status.toUpperCase()}`
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Update status error:", error);
    res.status(500).json({ error: error.message || "Failed to update status" });
  }
});

app.get("/api/posts/:postId/logs", authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const post = await getPostById(req.params.postId);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json({ logs: (post as any).logs || [] });
  } catch (error: any) {
    console.error("Get logs error:", error);
    res.status(500).json({ error: error.message || "Failed to get logs" });
  }
});

// ─── GEMINI AI ROUTES ─────────────────────────────────────────

app.post("/api/gemini/review", async (req: express.Request, res: express.Response) => {
  try {
    const { postContent, platform, persona, attachments } = req.body;
    if (!postContent) {
      res.status(400).json({ error: "Post content is required" });
      return;
    }
    const ai = getGeminiClient();

    let systemInstruction = "";
    if (persona === "jane") {
      systemInstruction = `You are Jane, the client representative/stakeholder. You are professional, practical, slightly demanding, and deeply concerned with brand reputation, clarity, and whether the post achieves target goals. Keep the feedback realistic, brief, and authentic like a Slack comment. Suggest whether it fits the brand or needs revision.`;
    } else if (persona === "lucas") {
      systemInstruction = `You are Lucas, the Senior Social Media Strategist. You are highly analytical, data-driven, and up-to-date with viral patterns, algorithms, and copywriting hooks. You suggest timing, hooks, hashtags, and formatting tricks (bullets, line-breaks) to maximize CTR and reach.`;
    } else if (persona === "elena") {
      systemInstruction = `You are Elena, the Creative Director. You are passionate about design, voice consistency, emotional resonance, and aesthetics. You critique the copy tone, visual alignment, storytelling element, and raw charm of the text. Speaks sophisticatedly yet constructively.`;
    } else {
      systemInstruction = `You are Dave, the Quality Assurance Editor and Copywriter. You hate spelling errors, jargon, muddy statements, passive voice, and grammatical issues. You write with clinical clarity, suggesting punchy grammar, crisp formatting, and corrections.`;
    }

    const userPrompt = `
Kindly review my planned social media post draft for the platform: ${platform}. 
Post Draft Text:
"${postContent}"
${attachments && attachments.length > 0 ? `The post also includes ${attachments.length} uploaded files/images.` : ""}

Please provide your critique, a decision on this post, and some constructive suggestions. 
You must respond in JSON format with the following exact keys:
1. "comment": a short, realistic, first-person paragraph (2-3 sentences) commenting on the draft.
2. "decision": one of "approved" (approved without reservations), "needs_work" (some critique), or "rejected" (strictly needs rewrite).
3. "suggestions": an array of 3 actionable short bullet-point tips.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            comment: { type: Type.STRING },
            decision: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["comment", "decision", "suggestions"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Review error:", error);
    res.status(500).json({ error: error.message || "Something went wrong in AI review" });
  }
});

app.post("/api/gemini/suggest", async (req: express.Request, res: express.Response) => {
  try {
    const { text, action, platform } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }
    const ai = getGeminiClient();

    let instruction = "";
    if (action === "expand") {
      instruction = "Expand this draft into an engaging, detailed social media post. Add appropriate structures, spacing, and polish.";
    } else if (action === "shorten") {
      instruction = "Condense this text down to a punchy, ultra-concise variant keeping the core message strong.";
    } else if (action === "make_funny") {
      instruction = "Rewrite this copy with a humorous, lightheaded, and friendly wit tailored for high social sharing.";
    } else if (action === "make_professional") {
      instruction = "Polish this into a highly professional, thought-leadership style text suitable for a high-end corporate presence.";
    } else {
      instruction = "Optimize and refine this text draft. Add appropriate formatting, emojis, and hashtags.";
    }

    const userPrompt = `
Optimize the following draft specifically for ${platform || "any social media platform"}.
Current draft:
"${text}"

Apply this style instruction: ${instruction}

Please respond in JSON format with the following keys:
1. "optimizedText": the final polished, rewritten copy text.
2. "justification": a single sentence explaining why this edit performs better on this platform.
3. "suggestedHashtags": array of 4-5 relevant hashtags.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedText: { type: Type.STRING },
            justification: { type: Type.STRING },
            suggestedHashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["optimizedText", "justification", "suggestedHashtags"],
        },
      },
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Suggest error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI suggestion" });
  }
});

// ─── Vite Dev Server / Static Build ───────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SocialCore Server listening at http://0.0.0.0:${PORT}`);
  });

  // Start BullMQ scheduler if Redis is available
  try {
    const { startScheduler } = await import("./src/workers/scheduler");
    await startScheduler();
  } catch (err: any) {
    console.warn("[Scheduler] BullMQ scheduler not started (Redis may be unavailable):", err.message);
  }

  // Start BullMQ publish worker if Redis is available
  try {
    const { publishWorker } = await import("./src/workers/queue");
    console.log("[Worker] Publish worker is listening for jobs");
  } catch (err: any) {
    console.warn("[Worker] BullMQ worker not started (Redis may be unavailable):", err.message);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  try {
    const { stopScheduler } = await import("./src/workers/scheduler");
    stopScheduler();
  } catch {}
  try {
    const { shutdownWorker } = await import("./src/workers/queue");
    await shutdownWorker();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
