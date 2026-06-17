import { SocialPost, TeamMember } from "./types";

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "user-1",
    name: "Sarah Jenkins",
    role: "Admin",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    email: "sarah@socialcore.io",
    status: "active",
  },
  {
    id: "user-2",
    name: "Marcus Cole",
    role: "Manager",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    email: "marcus@socialcore.io",
    status: "active",
  },
  {
    id: "user-3",
    name: "Emma Watson",
    role: "Contributor",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
    email: "emma.w@acme.com",
    status: "active",
  },
  {
    id: "user-4",
    name: "David Sterling",
    role: "Client",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    email: "david@acmeproducts.com",
    status: "active",
  }
];

export const WORKSPACES = [
  { id: "ws-acme", name: "Acme Corp Brand Suite", logo: "🚀", description: "Global social strategy for Acme Products & Services" },
  { id: "ws-tech", name: "TechStart SaaS Campaign", logo: "💻", description: "B2B LinkedIn and Twitter growth campaign" },
  { id: "ws-solis", name: "Solis Luxury Hotels", logo: "🌴", description: "Visual-heavy Instagram and TikTok campaigns" }
];

export const PLATFORMS_CONFIG = [
  { id: "facebook", name: "Facebook", color: "bg-blue-600 text-white", activeColor: "text-blue-600" },
  { id: "instagram", name: "Instagram", color: "bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white", activeColor: "text-pink-600" },
  { id: "twitter", name: "X / Twitter", color: "bg-black text-white", activeColor: "text-black" },
  { id: "linkedin", name: "LinkedIn", color: "bg-blue-700 text-white", activeColor: "text-blue-700" },
  { id: "tiktok", name: "TikTok", color: "bg-neutral-900 text-white", activeColor: "text-cyan-500" },
  { id: "youtube", name: "YouTube Shorts", color: "bg-red-600 text-white", activeColor: "text-red-600" }
];

// Helper to get relative ISO dates for our mock posts
const getRelativeDate = (daysOffset: number, hours: number = 10, minutes: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const INITIAL_POSTS: SocialPost[] = [
  {
    id: "post-1",
    title: "EcoBottle Pro Product Launch Announcement",
    content: "Big news! 🌍 Today we are officially launching the EcoBottle Pro. Engineered with double-walled ocean plastic composite that keeps your drinks ice-cold for 36 hours while pulling marine litter from our coastlines. \n\nEvery bottle purchased offsets 50kg of plastic waste. Join the refill revolution and save our oceans in style! 💧🐢\n\n#Sustainability #CleanOceans #EcoFriendly #Innovation #LaunchDay",
    platforms: ["facebook", "instagram", "linkedin"],
    status: "scheduled",
    scheduledAt: getRelativeDate(1, 14, 30),
    tags: ["Product Launch", "Green Initiative"],
    attachments: [
      {
        id: "att-1",
        name: "ecobottle_hero.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800",
        size: "1.4 MB"
      }
    ],
    comments: [
      {
        id: "comm-1",
        author: {
          id: "user-4",
          name: "David Sterling",
          role: "Client",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
        },
        text: "The post text looks wonderful, and the product lighting in this shot is top-tier. Approved for publishing on scheduled time!",
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: "comm-ai-lucas",
        author: {
          id: "ai-lucas",
          name: "Lucas (Strategist)",
          role: "Senior AI Strategist",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
          isAI: true,
          persona: "lucas"
        },
        text: "Solid launch draft. I recommend placing the call-to-action link higher in the text on Facebook to avoid getting truncated under the 'See More' bracket.",
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        suggestions: [
          "Move the Shop Link to line 3 before the description fold.",
          "Consider running an Instagram Stories countdown sticker.",
          "Add LinkedIn tag for our lead packaging designer."
        ]
      }
    ],
    logs: [
      {
        id: "log-1",
        user: { name: "Emma Watson", role: "Contributor" },
        action: "created post draft",
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString()
      },
      {
        id: "log-2",
        user: { name: "David Sterling", role: "Client" },
        action: "marked post as Approved & Scheduled",
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ]
  },
  {
    id: "post-2",
    title: "B2B Remote Collaboration Tips",
    content: "Remote teamwork isn't just about sharing Zoom links; it's about context symmetry. Over the last quarters, our distributed teams scaled core communication by 40% with three basic shifts:\n\n1️⃣ Asynchronous documentation over immediate meetings\n2️⃣ Explicit single-sentence decision logs\n3️⃣ Visual context tools like whiteboard-first brainstorming\n\nHow does your team lock down alignment? Read the full blueprint in our bio. 🎯\n\n#RemoteWork #FutureOfWork #TeamCollaboration #BusinessStrategy",
    platforms: ["linkedin", "twitter"],
    status: "pending",
    scheduledAt: getRelativeDate(2, 9, 15),
    tags: ["Thought Leadership", "Guides"],
    attachments: [
      {
        id: "att-2",
        name: "remote_collaboration.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
        size: "2.1 MB"
      }
    ],
    comments: [
      {
        id: "comm-2",
        author: {
          id: "user-3",
          name: "Emma Watson",
          role: "Contributor",
          avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
        },
        text: "I submitted this draft as Pending Approval. David, could you check the copy and make sure you are okay with publishing on X/Twitter and LinkedIn?",
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString()
      }
    ],
    logs: [
      {
        id: "log-3",
        user: { name: "Emma Watson", role: "Contributor" },
        action: "created draft and requested approval",
        timestamp: new Date(Date.now() - 12 * 3600000).toISOString()
      }
    ]
  },
  {
    id: "post-3",
    title: "Instagram Grid: Weekend Aesthetic",
    content: "Savoring the little moments of clarity. Slow mornings, crisp paper, warm ceramic cups, and a quiet space to scribble ideas. ☕️📓\n\nThis Saturday, take an hour to completely disconnect from notifications and align with what inspires you. What is your go-to weekend ritual?\n\n#SlowLiving #WorkspaceAesthetic #MinimalistHome #MindfulMornings #AestheticVibe",
    platforms: ["instagram", "tiktok"],
    status: "draft",
    scheduledAt: getRelativeDate(3, 11, 0),
    tags: ["Aesthetics", "Brand Vibe"],
    attachments: [
      {
        id: "att-3",
        name: "workspace_aesthetic.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800",
        size: "950 KB"
      }
    ],
    comments: [],
    logs: [
      {
        id: "log-4",
        user: { name: "Marcus Cole", role: "Manager" },
        action: "created draft",
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
      }
    ]
  },
  {
    id: "post-4",
    title: "TikTok Behind-the-Scenes Tour",
    content: "Ever wondered what goes on behind the scenes at our eco-certified packaging plant? 📦🌿 Here's a 30-second sneak peek into how we press, bundle, and double-seal every dispatch using organically sourced cornstarch starch. No toxins, no carbon waste. Just modern science at work!\n\nSound on for those ASMR crinkles! 🔊✨\n\n#ASMR #BehindTheScenes #ZeroWastePack #ManufacturingTech #SatisfyingSounds",
    platforms: ["tiktok", "youtube"],
    status: "pending",
    scheduledAt: getRelativeDate(4, 16, 0),
    tags: ["Behind The Scenes", "Video content"],
    attachments: [
      {
        id: "att-4",
        name: "asmr_packaging_clip.mp4",
        type: "video/mp4",
        url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800",
        size: "18.3 MB"
      }
    ],
    comments: [
      {
        id: "comm-ai-elena",
        author: {
          id: "ai-elena",
          name: "Elena (Creative)",
          role: "Senior AI Creative Director",
          avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
          isAI: true,
          persona: "elena"
        },
        text: "The audio pacing is marvelous and the crinkling sound triggers genuine satisfying responses. Let's make sure the caption remains clean with neon highlighters.",
        createdAt: new Date(Date.now() - 100000).toISOString(),
        suggestions: [
          "Format captions to begin with a high impact query like 'Satisfying 100% Zero-Waste ASMR? 📦'",
          "Enhance neon subtitles in the first 3 seconds of the clip."
        ]
      }
    ],
    logs: [
      {
        id: "log-5",
        user: { name: "Marcus Cole", role: "Manager" },
        action: "updated post text draft",
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString()
      }
    ]
  }
];
