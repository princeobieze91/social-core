import "dotenv/config";
import { WebSocket } from "ws";
(globalThis as any).WebSocket = WebSocket;
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById } from "./src/db";

const JWT_SECRET = process.env.JWT_SECRET || "socialcore-jwt-secret-dev-only";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization helper for Gemini client to prevent crash if key is missing when server starts
let generatorai: any = null;
function getGeminiClient() {
  if (!generatorai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please add it via Secrets panel in AI Studio settings.");
    }
    generatorai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return generatorai;
}

// REST API endpoints

// Endpoint for AI Reviewer comments
app.post("/api/gemini/review", async (req: express.Request, res: express.Response) => {
  try {
    const { postContent, platform, persona, attachments } = req.body;

    if (!postContent) {
       res.status(400).json({ error: "Post content is required" });
       return;
    }

    const ai = getGeminiClient();

    let systemInstruction = "";
    if (persona === "jane") { // Client
      systemInstruction = `You are Jane, the client representative/stakeholder. You are professional, practical, slightly demanding, and deeply concerned with brand reputation, clarity, and whether the post achieves target goals. Keep the feedback realistic, brief, and authentic like a Slack comment. Suggest whether it fits the brand or needs revision.`;
    } else if (persona === "lucas") { // Strategist
      systemInstruction = `You are Lucas, the Senior Social Media Strategist. You are highly analytical, data-driven, and up-to-date with viral patterns, algorithms, and copywriting hooks. You suggest timing, hooks, hashtags, and formatting tricks (bullets, line-breaks) to maximize CTR and reach.`;
    } else if (persona === "elena") { // Creative Director
      systemInstruction = `You are Elena, the Creative Director. You are passionate about design, voice consistency, emotional resonance, and aesthetics. You critique the copy tone, visual alignment, storytelling element, and raw charm of the text. Speaks sophisticatedly yet constructively.`;
    } else { // dave - Proofreader
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
            comment: {
              type: Type.STRING,
              description: "Short feedback paragraph (2-3 sentences) of the persona reviewing the post"
            },
            decision: {
              type: Type.STRING,
              description: "Decision of the post: 'approved', 'needs_work', 'rejected'"
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 highly actionable bullet-point tips"
            }
          },
          required: ["comment", "decision", "suggestions"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);

  } catch (error: any) {
    console.error("Gemini Review error:", error);
    res.status(500).json({ error: error.message || "Something went wrong in AI review" });
  }
});

// Endpoint for AI text assistant suggestions (Optimize/Re-write/Tone modifier)
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
            suggestedHashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["optimizedText", "justification", "suggestedHashtags"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);

  } catch (error: any) {
    console.error("Gemini Suggest error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI suggestion" });
  }
});

// Auth middleware
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

// POST /api/auth/register
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

// POST /api/auth/login
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

// GET /api/auth/me
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

// Serve Vite dev server or static distribution files
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
}

startServer();
