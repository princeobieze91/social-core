import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Calendar, 
  Layers, 
  Grid as GridIcon, 
  List as ListIcon, 
  Sparkles, 
  MessageSquare, 
  CheckCircle, 
  X, 
  Trash2, 
  Clock, 
  ThumbsUp, 
  Eye, 
  Share2, 
  Heart, 
  MessageCircle, 
  Send, 
  Tag, 
  Bell, 
  Edit3, 
  Check, 
  Lock, 
  UserCheck, 
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileImage,
  Video,
  Menu,
  PanelRightOpen,
  PanelRightClose,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  FolderOpen,
  FileText,
  TrendingUp,
  BarChart3,
  Monitor,
  Smartphone,
  Hash,
  Flag,
  Target,
  Save,
  Image as ImageIcon
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import LoginRegister from "./components/LoginRegister";
import OAuthConsent from "./components/OAuthConsent";
import { SocialPost, TeamMember, PostComment, ActiveView, PostAttachment } from "./types";
import { PLATFORMS_CONFIG } from "./platforms";
import {
  apiGetPosts,
  apiCreatePost,
  apiUpdatePost,
  apiDeletePost,
  apiUpdatePostStatus,
  apiAddComment,
  apiGetWorkspaces,
  apiGetWorkspaceMembers,
  apiPublishPost,
  apiScheduleAndQueue,
} from "./api";

export default function App() {
  // --- Persistent & UI States ---
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    const saved = localStorage.getItem("socialcore_user_session");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });

  const [posts, setPosts] = useState<SocialPost[]>([]);

  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; logo: string; description?: string }>>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<TeamMember[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>("");
  const [actingUser, setActingUser] = useState<TeamMember | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("socialcore_auth_token");
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileCollabOpen, setIsMobileCollabOpen] = useState(false);
  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(true);
  const [consentProvider, setConsentProvider] = useState<string | null>(null);
  
  // Bulk selection list check state
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("calendar");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection state for detail/collaboration sidebar
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const selectedPost = posts.find(p => p.id === selectedPostId) || posts[0] || null;

  // Form state for Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(["facebook"]);
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formTags, setFormTags] = useState<string[]>(["General"]);
  const [formTagInput, setFormTagInput] = useState("");
  const [formAttachments, setFormAttachments] = useState<PostAttachment[]>([]);
  
  // Drag and drop / file simulated link state
  const [simulatedMediaUrl, setSimulatedMediaUrl] = useState("");
  const [simulatedMediaName, setSimulatedMediaName] = useState("");

  // Gemini AI assistant states
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [aiAssistantJustification, setAiAssistantJustification] = useState("");
  const [aiAssistantHashtags, setAiAssistantHashtags] = useState<string[]>([]);
  const [aiReviewerLoading, setAiReviewerLoading] = useState<string | null>(null);

  // New Comment Input state
  const [commentText, setCommentText] = useState("");

  // Content Detail Tray state
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [simulatorMode, setSimulatorMode] = useState<"desktop" | "mobile">("desktop");
  const [targetAudience, setTargetAudience] = useState("");
  const [campaignObjectives, setCampaignObjectives] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});

  // Sync editor state when selectedPost changes
  useEffect(() => {
    if (selectedPost) {
      setEditorTitle(selectedPost.title);
      setEditorContent(selectedPost.content);
      setTargetAudience((selectedPost as any).targetAudience || "");
      setCampaignObjectives((selectedPost as any).campaignObjectives || "");
      setInternalNotes((selectedPost as any).internalNotes || "");
      // Reset approvals
      const initialApprovals: Record<string, boolean> = {};
      workspaceMembers.forEach(m => { initialApprovals[m.id] = false; });
      setApprovals(initialApprovals);
    }
  }, [selectedPost?.id]);

  // Sync user session details dynamically
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("socialcore_user_session", JSON.stringify(currentUser));
      setActingUser(currentUser);
    } else {
      localStorage.removeItem("socialcore_user_session");
    }
  }, [currentUser]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("socialcore_auth_token", authToken);
    } else {
      localStorage.removeItem("socialcore_auth_token");
    }
  }, [authToken]);

  // Handle Auth0 OAuth callback (hash-based tokens)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const idToken = params.get("id_token");

      window.history.replaceState({}, "", window.location.pathname);
      localStorage.removeItem("auth0_state");
      localStorage.removeItem("auth0_nonce");

      if (idToken) {
        fetch("/api/auth/auth0", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, accessToken })
        })
          .then(res => res.json())
          .then(data => {
            if (data.token && data.user) {
              setCurrentUser(data.user);
              setAuthToken(data.token);
            } else {
              console.error("Auth0 login failed:", data.error);
            }
          })
          .catch(e => console.error("Auth0 login failed:", e));
      }
    }
  }, []);

  // Load workspaces and posts from API when user is authenticated
  useEffect(() => {
    if (!currentUser || !authToken) return;

    apiGetWorkspaces()
      .then(({ workspaces: apiWorkspaces }) => {
        setWorkspaces(apiWorkspaces);
        if (apiWorkspaces.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(apiWorkspaces[0].id);
        }
      })
      .catch(() => {
        // API unavailable - continue with empty state
      });
  }, [currentUser, authToken]);

  // Load workspace members when workspace changes
  useEffect(() => {
    if (!currentWorkspace || !authToken) return;

    apiGetWorkspaceMembers(currentWorkspace)
      .then(({ members: apiMembers }) => {
        setWorkspaceMembers(apiMembers);
        if (apiMembers.length > 0 && !actingUser) {
          setActingUser(apiMembers[0]);
        }
      })
      .catch(() => {
        // API unavailable - continue with empty state
      });
  }, [currentWorkspace, authToken]);

  // Load posts from API when workspace changes
  useEffect(() => {
    if (!currentUser || !authToken || !currentWorkspace) return;
    apiGetPosts(currentWorkspace)
      .then(({ posts: apiPosts }) => {
        if (apiPosts && apiPosts.length > 0) {
          const normalized: SocialPost[] = apiPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            platforms: p.platforms || ["facebook"],
            status: p.status || "draft",
            scheduledAt: p.scheduled_at || p.created_at,
            attachments: (p.attachments || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              url: a.url,
              size: a.size,
            })),
            comments: (p.comments || []).map((c: any) => ({
              id: c.id,
              author: {
                id: c.author_id,
                name: c.author_name,
                role: c.author_role || "",
                avatarUrl: c.author_avatar_url || "",
                isAI: c.is_ai,
                persona: c.persona,
              },
              text: c.text,
              createdAt: c.created_at,
              suggestions: c.suggestions || [],
            })),
            logs: (p.logs || []).map((l: any) => ({
              id: l.id,
              user: { name: l.user_name, role: l.user_role },
              action: l.action,
              timestamp: l.created_at,
            })),
            tags: [],
          }));
          setPosts(normalized);
        }
      })
      .catch(() => {
        // API unavailable - continue with empty state
      });
  }, [currentUser, authToken, currentWorkspace]);

  // Save to local storage on changes
  useEffect(() => {
    localStorage.setItem("socialcore_posts", JSON.stringify(posts));
  }, [posts]);

  // Sync post selection details if posts list updates
  useEffect(() => {
    if (posts.length > 0 && !posts.some(p => p.id === selectedPostId)) {
      setSelectedPostId(posts[0].id);
    }
    // Auto-open collab panel when a post is selected
    if (selectedPostId && posts.some(p => p.id === selectedPostId)) {
      setIsCollabPanelOpen(true);
      setIsMobileCollabOpen(true);
    }
  }, [posts, selectedPostId]);

  // Core metrics calculated from posts
  const postCountsObj = {
    draft: posts.filter(p => p.status === "draft").length,
    pending: posts.filter(p => p.status === "pending").length,
    approved: posts.filter(p => p.status === "approved").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
  };

  // Helper date generators for Calendar headers
  const getDaysOfWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date();
    monday.setDate(today.getDate() + distanceToMonday);

    return Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + idx);
      return day;
    });
  };
  const weekDays = getDaysOfWeek();

  // Filter posts based on acting workspace guidelines and channel filters
  const filteredPostsByWorkspaceAndPlatform = posts.filter(post => {
    const matchesWorkspace = 
      currentWorkspace === "ws-tech" ? post.tags.includes("Thought Leadership") || post.platforms.includes("linkedin") || post.platforms.includes("twitter") :
      currentWorkspace === "ws-solis" ? post.platforms.includes("instagram") || post.platforms.includes("tiktok") :
      true;

    const matchesPlatform = selectedPlatformFilter ? post.platforms.includes(selectedPlatformFilter) : true;
    
    const matchesSearch = searchQuery 
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    return matchesWorkspace && matchesPlatform && matchesSearch;
  });

  // Open modal for creating new post
  const handleOpenCreateModal = () => {
    setEditingPost(null);
    setFormTitle("New Q3 Campaign Draft");
    setFormContent("We are excited to share this incredible milestone with our global community! Stay tuned as we lift the curtains next Tuesday. ✨🌎\n\n#Milestone #TeamWork #Innovation");
    setFormPlatforms(["facebook", "instagram"]);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormScheduledAt(localISO);
    
    setFormTags(["Campaign", "Teaser"]);
    setFormAttachments([
      {
        id: "att-" + Date.now(),
        name: "hero_visual.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=600",
        size: "1.2 MB"
      }
    ]);
    setFormTagInput("");
    setSimulatedMediaUrl("");
    setSimulatedMediaName("");
    setAiAssistantJustification("");
    setAiAssistantHashtags([]);
    setIsModalOpen(true);
  };

  // Open modal for editing existing post
  const handleOpenEditModal = (post: SocialPost) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormContent(post.content);
    setFormPlatforms(post.platforms);
    const d = new Date(post.scheduledAt);
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setFormScheduledAt(localISO);
    setFormTags(post.tags);
    setFormAttachments([...post.attachments]);
    setFormTagInput("");
    setSimulatedMediaUrl("");
    setSimulatedMediaName("");
    setAiAssistantJustification("");
    setAiAssistantHashtags([]);
    setIsModalOpen(true);
  };

  // Submit Post Form (Create or Write-back) - tries API first, falls back to localStorage
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent || !actingUser) return;

    const scheduledISO = new Date(formScheduledAt).toISOString();

    if (editingPost) {
      // Update via API
      const optimistic: SocialPost = {
        ...editingPost,
        title: formTitle,
        content: formContent,
        platforms: formPlatforms,
        scheduledAt: scheduledISO,
        attachments: formAttachments,
        tags: formTags,
        logs: [
          ...editingPost.logs,
          {
            id: "log-" + Date.now(),
            user: { name: actingUser.name, role: actingUser.role },
            action: "Modified post attributes",
            timestamp: new Date().toISOString(),
          },
        ],
      };
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? optimistic : p)));
      try {
        await apiUpdatePost(editingPost.id, {
          title: formTitle,
          content: formContent,
          platforms: formPlatforms,
          scheduled_at: scheduledISO,
        });
      } catch {
        // API unavailable - optimistic update already applied
      }
    } else {
      // Create via API
      const tempId = "post-" + Date.now();
      const newPost: SocialPost = {
        id: tempId,
        title: formTitle,
        content: formContent,
        platforms: formPlatforms,
        status: "draft",
        scheduledAt: scheduledISO,
        attachments: formAttachments,
        tags: formTags,
        comments: [],
        logs: [
          {
            id: "log-" + Date.now(),
            user: { name: actingUser.name, role: actingUser.role },
            action: "Created new draft",
            timestamp: new Date().toISOString(),
          },
        ],
      };
      setPosts((prev) => [newPost, ...prev]);
      setSelectedPostId(tempId);
      try {
        const { post: created } = await apiCreatePost(currentWorkspace, {
          title: formTitle,
          content: formContent,
          platforms: formPlatforms,
          status: "draft",
          scheduled_at: scheduledISO,
          attachments: formAttachments,
        });
        if (created) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    id: created.id,
                    logs: [
                      {
                        id: "log-" + Date.now(),
                        user: { name: actingUser.name, role: actingUser.role },
                        action: "Created new draft",
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  }
                : p
            )
          );
          setSelectedPostId(created.id);
        }
      } catch {
        // API unavailable - localStorage data is already set
      }
    }

    setIsModalOpen(false);
  };

  // Add customized attachment link inside form
  const handleAddSimulatedAttachment = () => {
    if (!simulatedMediaUrl) return;
    const name = simulatedMediaName || "interactive_media_reference.jpg";
    const newAttach: PostAttachment = {
      id: "att-" + Date.now(),
      name: name,
      type: name.endsWith(".mp4") ? "video/mp4" : "image/jpeg",
      url: simulatedMediaUrl,
      size: "2.4 MB"
    };
    setFormAttachments(prev => [...prev, newAttach]);
    setSimulatedMediaUrl("");
    setSimulatedMediaName("");
  };

  const handleRemoveAttachment = (id: string) => {
    setFormAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleAddTag = () => {
    if (!formTagInput.trim()) return;
    if (!formTags.includes(formTagInput.trim())) {
      setFormTags(prev => [...prev, formTagInput.trim()]);
    }
    setFormTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setFormTags(prev => prev.filter(tag => tag !== t));
  };

  // Delete post completely - tries API first
  const handleDeletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this planned post candidate?")) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setSelectedPostIds((prev) => prev.filter((selectedId) => selectedId !== id));
      try {
        await apiDeletePost(id);
      } catch {
        // API unavailable - already removed from local state
      }
    }
  };

  // --- Bulk Actions Operations ---
  const handleMassApprove = async () => {
    if (selectedPostIds.length === 0 || !actingUser) return;
    setPosts(prev => prev.map(p => {
      if (selectedPostIds.includes(p.id)) {
        return {
          ...p,
          status: "approved" as const,
          logs: [
            ...p.logs,
            {
              id: "log-bulk-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
              user: { name: actingUser.name, role: actingUser.role },
              action: "Batch approved campaign draft via Bulk Action Panel",
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return p;
    }));
    for (const id of selectedPostIds) {
      try { await apiUpdatePostStatus(id, "approved"); } catch {}
    }
    setSelectedPostIds([]);
    alert("Selected campaign drafts have been approved successfully!");
  };

  const handleBatchDelete = async () => {
    if (selectedPostIds.length === 0) return;
    if (confirm(`Are you sure you want to batch delete these ${selectedPostIds.length} campaigns?`)) {
      setPosts(prev => prev.filter(p => !selectedPostIds.includes(p.id)));
      for (const id of selectedPostIds) {
        try { await apiDeletePost(id); } catch {}
      }
      setSelectedPostIds([]);
    }
  };

  const handleBulkReschedule = async (targetDateStr: string) => {
    if (!targetDateStr || !actingUser) return;
    const targetDate = new Date(targetDateStr);
    setPosts(prev => prev.map(p => {
      if (selectedPostIds.includes(p.id)) {
        return {
          ...p,
          scheduledAt: targetDate.toISOString(),
          logs: [
            ...p.logs,
            {
              id: "log-bulk-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
              user: { name: actingUser.name, role: actingUser.role },
              action: `Batch rescheduled planning to ${targetDate.toLocaleString()} via Bulk Action Panel`,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return p;
    }));
    for (const id of selectedPostIds) {
      try { await apiUpdatePost(id, { scheduled_at: targetDate.toISOString() }); } catch {}
    }
    setSelectedPostIds([]);
    alert("Selected campaigns have been rescheduled successfully!");
  };

  // Trigger Gemini API to optimize current draft text
  const handleOptimizeWithGemini = async (action: string) => {
    if (!formContent) return;
    setAiAssistantLoading(true);
    setAiAssistantJustification("");
    try {
      const response = await fetch("/api/gemini/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: formContent,
          action: action,
          platform: formPlatforms[0] || "any platform"
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to trigger AI advice");
      }

      const data = await response.json();
      if (data.optimizedText) {
        setFormContent(data.optimizedText);
      }
      if (data.justification) {
        setAiAssistantJustification(data.justification);
      }
      if (data.suggestedHashtags) {
        setAiAssistantHashtags(data.suggestedHashtags);
      }
    } catch (e: any) {
      console.error(e);
      alert("AI optimization error: " + e.message);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Apply suggested hashtags automatically
  const handleApplyAiHashtags = () => {
    if (aiAssistantHashtags.length === 0) return;
    const tagText = aiAssistantHashtags.join(" ");
    setFormContent(prev => prev + "\n\n" + tagText);
    setAiAssistantHashtags([]);
  };

  // Trigger Gemini Persona Reviewer feedback simulating Planable client collaboration process
  const handleTriggerPersonaReview = async (persona: 'jane' | 'lucas' | 'elena' | 'dave') => {
    if (!selectedPost) return;
    setAiReviewerLoading(persona);
    try {
      const response = await fetch("/api/gemini/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postContent: selectedPost.content,
          platform: selectedPost.platforms.join(", "),
          persona: persona,
          attachments: selectedPost.attachments
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "AI review failed");
      }

      const data = await response.json();
      
      const avatarsMap = {
        jane: {
          name: "Jane (Brand Stakeholder)",
          role: "Client Brand Lead",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
        },
        lucas: {
          name: "Lucas (Growth Strategist)",
          role: "Senior Social Editor",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
        },
        elena: {
          name: "Elena (Creative Director)",
          role: "VP Creative Voice",
          avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150"
        },
        dave: {
          name: "Dave (Proofreader QA)",
          role: "Chief Quality Officer",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
        }
      };

      const selectedPersonaInfo = avatarsMap[persona];

      const newAiComment: PostComment = {
        id: "ai-comm-" + Date.now(),
        author: {
          id: `ai-${persona}`,
          name: selectedPersonaInfo.name,
          role: selectedPersonaInfo.role,
          avatarUrl: selectedPersonaInfo.avatar,
          isAI: true,
          persona: persona
        },
        text: data.comment || "Looks acceptable, though we should make sure styling stays inline.",
        createdAt: new Date().toISOString(),
        suggestions: data.suggestions || []
      };

      let newStatus = selectedPost.status;
      if (data.decision === "approved") {
        newStatus = "approved";
      } else if (data.decision === "rejected") {
        newStatus = "draft";
      } else if (data.decision === "needs_work") {
        newStatus = "pending";
      }

      const updatedLogs = [
        ...selectedPost.logs,
        {
          id: "log-" + Date.now(),
          user: { name: selectedPersonaInfo.name, role: "AI Expert Team" },
          action: `Reviewed draft. Feedback decision: ${data.decision.toUpperCase()}`,
          timestamp: new Date().toISOString()
        }
      ];

      setPosts(prev => prev.map(p => {
        if (p.id === selectedPost.id) {
          return {
            ...p,
            status: newStatus,
            comments: [...p.comments, newAiComment],
            logs: updatedLogs
          };
        }
        return p;
      }));

      try {
        await apiAddComment(selectedPost.id, {
          text: data.comment || "Looks acceptable.",
          is_ai: true,
          persona,
          author_name: selectedPersonaInfo.name,
          author_role: selectedPersonaInfo.role,
          author_avatar_url: selectedPersonaInfo.avatar,
          suggestions: data.suggestions,
        });
      } catch {
        // API unavailable - already in local state
      }

    } catch (e: any) {
      console.error(e);
      alert("AI Reviewer failed to generate response: " + e.message);
    } finally {
      setAiReviewerLoading(null);
    }
  };

  // Add general text comment from currently logged-in actor - tries API first
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost || !actingUser) return;

    const newComment: PostComment = {
      id: "user-comm-" + Date.now(),
      author: {
        id: actingUser.id,
        name: actingUser.name,
        role: actingUser.role,
        avatarUrl: actingUser.avatarUrl
      },
      text: commentText,
      createdAt: new Date().toISOString()
    };

    const updatedLogs = [
      ...selectedPost.logs,
      {
        id: "log-" + Date.now(),
        user: { name: actingUser.name, role: actingUser.role },
        action: `Added feedback comment on candidate`,
        timestamp: new Date().toISOString()
      }
    ];

    setPosts(prev => prev.map(p => {
      if (p.id === selectedPost.id) {
        return {
          ...p,
          comments: [...p.comments, newComment],
          logs: updatedLogs
        };
      }
      return p;
    }));

    setCommentText("");

    try {
      await apiAddComment(selectedPost.id, {
        text: commentText,
      });
    } catch {
      // API unavailable - optimistic update already applied
    }
  };

  // Planable status/approval pipelines - tries API first
  const handleUpdateStatus = async (status: 'draft' | 'pending' | 'approved' | 'scheduled' | 'published') => {
    if (!selectedPost || !actingUser) return;
    
    const updatedLogs = [
      ...selectedPost.logs,
      {
        id: "log-" + Date.now(),
        user: { name: actingUser.name, role: actingUser.role },
        action: `Changed workflow state to **${status.toUpperCase()}**`,
        timestamp: new Date().toISOString()
      }
    ];

    setPosts(prev => prev.map(p => {
      if (p.id === selectedPost.id) {
        return { ...p, status, logs: updatedLogs };
      }
      return p;
    }));

    try {
      await apiUpdatePostStatus(selectedPost.id, status);
    } catch {
      // API unavailable - optimistic update already applied
    }
  };

  const handlePublishNow = async (postId: string) => {
    if (!confirm("Publish this post to its connected social channels now?")) return;
    if (!actingUser) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, status: "publishing" as const };
      }
      return p;
    }));

    try {
      const result = await apiPublishPost(postId);
      
      if (result.success) {
        const successPlatforms = result.results.filter((r: any) => r.success).map((r: any) => r.platform);
        const failPlatforms = result.results.filter((r: any) => !r.success);
        
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              status: "published" as const,
              logs: [
                ...p.logs,
                {
                  id: "log-" + Date.now(),
                  user: { name: actingUser.name, role: actingUser.role },
                  action: `Published to: ${successPlatforms.join(', ')}`,
                  timestamp: new Date().toISOString()
                },
                ...(failPlatforms.length > 0 ? [{
                  id: "log-" + Date.now() + "-fail",
                  user: { name: "System", role: "system" },
                  action: `Failed on: ${failPlatforms.map((r: any) => `${r.platform}: ${r.error}`).join('; ')}`,
                  timestamp: new Date().toISOString()
                }] : [])
              ]
            };
          }
          return p;
        }));

        if (failPlatforms.length > 0) {
          alert(`Published to ${successPlatforms.join(', ')}.\n\nIssues on: ${failPlatforms.map((r: any) => `${r.platform}: ${r.error}`).join('\n')}`);
        } else {
          alert(`✅ Successfully published to ${successPlatforms.join(', ')}!`);
        }
      } else {
        const errorMsg = result.results.map((r: any) => `${r.platform}: ${r.error}`).join('; ');
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              status: "failed" as const,
              logs: [
                ...p.logs,
                {
                  id: "log-" + Date.now(),
                  user: { name: actingUser.name, role: actingUser.role },
                  action: `Publish failed: ${errorMsg}`,
                  timestamp: new Date().toISOString()
                }
              ]
            };
          }
          return p;
        }));
        alert(`❌ Publish failed:\n${errorMsg}`);
      }
    } catch (err: any) {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, status: post.status };
        }
        return p;
      }));
      alert("Publish failed: " + (err.message || "API unavailable"));
    }
  };

  const handleReschedule = async (postId: string, dateStr: string) => {
    const postToChg = posts.find(p => p.id === postId);
    if (!postToChg || !actingUser) return;

    const originalDate = new Date(postToChg.scheduledAt);
    const newTargetDate = new Date(dateStr);
    newTargetDate.setHours(originalDate.getHours());
    newTargetDate.setMinutes(originalDate.getMinutes());

    const updatedLogs = [
      ...postToChg.logs,
      {
        id: "log-" + Date.now(),
        user: { name: actingUser.name, role: actingUser.role },
        action: `Rescheduled to ${newTargetDate.toLocaleDateString()} via Calendar Drag-Simulator`,
        timestamp: new Date().toISOString()
      }
    ];

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, scheduledAt: newTargetDate.toISOString(), logs: updatedLogs };
      }
      return p;
    }));

    try {
      await apiUpdatePost(postId, { scheduled_at: newTargetDate.toISOString() });
    } catch {
      // API unavailable - optimistic update already applied
    }
  };

  const renderPlatformBadgeIcon = (platformId: string) => {
    const platform = PLATFORMS_CONFIG.find(p => p.id === platformId) || PLATFORMS_CONFIG[0];
    const emojiMap = {
      facebook: "👥",
      instagram: "📸",
      twitter: "𝕏",
      linkedin: "💼",
      tiktok: "📱",
      youtube: "🔺"
    };
    return (
      <span key={platformId} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 text-[11px] font-semibold font-sans text-slate-700 px-2 py-1 rounded-md" title={platform.name}>
        <span className="text-[12px]">{emojiMap[platformId as keyof typeof emojiMap] || "📄"}</span>
        <span>{platform.name}</span>
      </span>
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "approved":
        return { text: "Approved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "scheduled":
        return { text: "Scheduled Auto", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "pending":
        return { text: "Awaiting Review", badge: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" };
      case "published":
        return { text: "Published", badge: "bg-blue-50 text-blue-700 border-blue-200" };
      default:
        return { text: "Draft Planning", badge: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  // Check for OAuth consent route
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider");
    if (window.location.pathname === "/oauth/consent" && provider) {
      setConsentProvider(provider);
    }
  }, []);

  // Save editor changes back to post
  const handleSaveEditorChanges = () => {
    if (!selectedPost || !editorTitle.trim()) return;
    
    const updatedLogs = [
      ...selectedPost.logs,
      {
        id: "log-" + Date.now(),
        user: { name: actingUser?.name || "User", role: actingUser?.role || "" },
        action: "Updated content via Content Detail Tray",
        timestamp: new Date().toISOString()
      }
    ];

    setPosts(prev => prev.map(p => {
      if (p.id === selectedPost.id) {
        return {
          ...p,
          title: editorTitle,
          content: editorContent,
          logs: updatedLogs,
          // Store extra fields as extended properties (in real app these would be DB columns)
          ...(targetAudience ? { targetAudience } : {}),
          ...(campaignObjectives ? { campaignObjectives } : {}),
          ...(internalNotes ? { internalNotes } : {})
        };
      }
      return p;
    }));
  };

  // Toggle approval for a stakeholder
  const toggleApproval = (memberId: string) => {
    setApprovals(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  // Check if all required stakeholders approved
  const allApproved = workspaceMembers.length > 0 && workspaceMembers.every(m => approvals[m.id]);

  if (consentProvider) {
    return <OAuthConsent provider={consentProvider} onBack={() => { setConsentProvider(null); window.history.replaceState({}, "", "/"); }} />;
  }

  if (!currentUser) {
    return <LoginRegister onLoginSuccess={(u, t) => { setCurrentUser(u); setAuthToken(t || null); }} />;
  }

  if (!actingUser) {
    return <div className="flex items-center justify-center h-screen">Loading workspace...</div>;
  }

  // Dashboard render function
  const renderDashboard = () => {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Active Projects</span>
              <FolderOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{workspaces.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total workspaces</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Posts</span>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{posts.length}</p>
            <p className="text-xs text-slate-500 mt-1">{postCountsObj.approved} approved</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Team Members</span>
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{workspaceMembers.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active collaborators</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Completion Rate</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{posts.length > 0 ? Math.round((postCountsObj.published / posts.length) * 100) : 0}%</p>
            <p className="text-xs text-slate-500 mt-1">Published content</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Overview Widget */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Project Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Campaigns</span>
                <span className="text-sm font-semibold">{posts.length} total content pieces</span>
              </div>
              
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Published vs Scheduled</span>
                  <span className="text-xs font-semibold">{postCountsObj.published}/{posts.length}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${posts.length > 0 ? (postCountsObj.published / posts.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Status Flags */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  On Track: {postCountsObj.published}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Pending: {postCountsObj.pending + postCountsObj.scheduled}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Blocked: {postCountsObj.draft}
                </span>
              </div>
            </div>
          </div>

          {/* Workload & Resource Allocation Widget */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Workload Allocation</h3>
            <div className="space-y-3">
              {workspaceMembers.slice(0, 4).map(member => {
                const memberPosts = posts.filter(p => p.comments.some(c => c.author.id === member.id));
                const utilization = Math.min(100, Math.round((memberPosts.length / Math.max(1, posts.length)) * 100));
                return (
                  <div key={member.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate">{member.name}</span>
                      <span className={`font-semibold ${utilization > 80 ? 'text-red-600' : utilization > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {utilization}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines Widget */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-xs font-semibold text-slate-600">Task</th>
                  <th className="pb-2 text-xs font-semibold text-slate-600">Parent Campaign</th>
                  <th className="pb-2 text-xs font-semibold text-slate-600">Due Date</th>
                  <th className="pb-2 text-xs font-semibold text-slate-600">Owner</th>
                  <th className="pb-2 text-xs font-semibold text-slate-600">Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.slice(0, 5).map(post => (
                  <tr key={post.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedPostId(post.id)}>
                    <td className="py-3">
                      <p className="text-sm font-medium">{post.title}</p>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-slate-500">{post.tags[0] || "General"}</span>
                    </td>
                    <td className="py-3 text-sm text-slate-600">
                      {new Date(post.scheduledAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-indigo-700">
                            {post.comments[0]?.author.name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <span className="text-xs">{post.comments[0]?.author.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {post.platforms.slice(0, 2).map(p => (
                          <span key={p} className="text-xs bg-slate-100 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 select-none overflow-hidden font-sans text-slate-900">
      
      {/* 1. Navigation Sidebar (Left Panel) - 240px fixed width */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col h-screen shrink-0 shadow-xl">
        {/* Planables Logo - Top */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">P</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Planables</h1>
              <p className="text-[10px] text-slate-400">Social Media Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveView('calendar')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'calendar' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Calendar
          </button>

          <button
            onClick={() => setActiveView('feed')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'feed' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-5 h-5" />
            Feed Preview
          </button>

          <button
            onClick={() => setActiveView('grid')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'grid' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GridIcon className="w-5 h-5" />
            Instagram Grid
          </button>

          <button
            onClick={() => setActiveView('list')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'list' 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListIcon className="w-5 h-5" />
            Bulk List
          </button>

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Management</p>
          </div>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
            Team
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5" />
            Reports
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* Planables Logo - Bottom & User Profile */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {/* Workspace Selector */}
          <div className="relative">
            <select
              value={currentWorkspace}
              onChange={(e) => setCurrentWorkspace(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <img 
              src={actingUser.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(actingUser.name) + "&background=6366f1&color=fff"} 
              alt={actingUser.name}
              className="w-9 h-9 rounded-full border-2 border-slate-600 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{actingUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{actingUser.role}</p>
            </div>
            <button
              onClick={() => { setCurrentUser(null); setAuthToken(null); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* 2. Global Header (Top Bar) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Workspace/Account Selector */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">{workspaces.find(w => w.id === currentWorkspace)?.name || 'All Workspaces'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Quick Tools */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <img 
                src={actingUser.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(actingUser.name) + "&background=6366f1&color=fff"} 
                alt={actingUser.name}
                className="w-8 h-8 rounded-full border-2 border-slate-200 object-cover"
              />
            </div>
          </div>
        </header>

        {/* 3. Central Grid Widgets (Main Workspace) */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {renderDashboard()}
        </main>
      </div>

      {/* 4. Content Detail Side Tray (Flyout Panel) */}
      {isCollabPanelOpen && selectedPost && (
        <aside className="w-[480px] border-l border-slate-200 bg-white flex flex-col h-screen shrink-0 shadow-sm">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Campaign Block</span>
              <button
                onClick={() => setIsCollabPanelOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Editable Title */}
            <input
              type="text"
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              className="w-full text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none mb-2 pb-1"
            />
            
            {/* Campaign ID & Meta */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-3">
              <span>ID: {selectedPost.id.substring(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span>{selectedPost.scheduledAt ? new Date(selectedPost.scheduledAt).toLocaleString() : "Not scheduled"}</span>
            </div>

            {/* Target Channels */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedPost.platforms.map(p => (
                <span key={p} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold px-2 py-1 rounded-md">
                  {p}
                </span>
              ))}
            </div>

            {/* Status Lifecycle Badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusStyle(selectedPost.status).badge}`}>
                {getStatusStyle(selectedPost.status).text}
              </span>
              <div className="flex gap-1">
                {['draft', 'pending', 'approved', 'scheduled', 'published'].map((status, idx) => {
                  const currentIdx = ['draft', 'pending', 'approved', 'scheduled', 'published'].indexOf(selectedPost.status);
                  const isActive = idx <= currentIdx;
                  return (
                    <div key={status} className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-200'}`} title={status} />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/30">
            <button className="flex-1 px-4 py-2 text-xs font-semibold text-indigo-600 border-b-2 border-indigo-600">Creative</button>
            <button className="flex-1 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">Collaboration</button>
            <button className="flex-1 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">Context</button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Creative Canvas Section */}
            <div className="p-4 space-y-4">
              {/* Copywriter Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Copywriter Editor</label>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{editorContent.length} chars</span>
                    <span>•</span>
                    <span>{editorContent.split('#').length - 1} hashtags</span>
                  </div>
                </div>
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Write your content here..."
                  className="w-full h-32 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">😀 Emoji</button>
                  <button className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"># Hashtag</button>
                  <button className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">@ Mention</button>
                </div>
              </div>

              {/* Media Asset Vault */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Media Asset Vault</label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedPost.attachments.map(att => (
                    <div key={att.id} className="relative group aspect-square bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                      {att.type.startsWith('image') ? (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="p-1.5 bg-white rounded-lg text-red-500 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[9px] text-white truncate">{att.name}</p>
                      </div>
                    </div>
                  ))}
                  <button className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Add Media</span>
                  </button>
                </div>
              </div>

              {/* Live Simulator Window */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Live Simulator</label>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setSimulatorMode('desktop')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${simulatorMode === 'desktop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <Monitor className="w-3 h-3 inline mr-1" />
                      Desktop
                    </button>
                    <button
                      onClick={() => setSimulatorMode('mobile')}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${simulatorMode === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <Smartphone className="w-3 h-3 inline mr-1" />
                      Mobile
                    </button>
                  </div>
                </div>
                <div className={`border border-slate-200 rounded-lg overflow-hidden bg-slate-50 ${simulatorMode === 'mobile' ? 'max-w-[240px] mx-auto' : 'w-full'}`}>
                  <div className={`bg-white p-3 ${simulatorMode === 'mobile' ? 'text-xs' : 'text-sm'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                        {actingUser.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{editorTitle || "Post Title"}</p>
                        <p className="text-slate-400 text-[10px]">Just now</p>
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap line-clamp-4">{editorContent}</p>
                    {selectedPost.attachments[0] && (
                      <div className="mt-2 rounded-lg overflow-hidden">
                        <img src={selectedPost.attachments[0].url} alt="" className="w-full h-32 object-cover" />
                      </div>
                    )}
                    <div className="flex gap-3 mt-3 text-slate-400 text-xs">
                      <span>❤️ 24</span>
                      <span>💬 3</span>
                      <span>🔗 Share</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaboration & Context Hub */}
            <div className="border-t border-slate-100 p-4 space-y-4">
              {/* Approval Gatekeeper */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Approval Gatekeeper</label>
                <div className="space-y-2">
                  {workspaceMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <img 
                          src={member.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(member.name) + "&background=random&size=32"} 
                          alt={member.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-700">{member.name}</p>
                          <p className="text-[10px] text-slate-400">{member.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleApproval(member.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          approvals[member.id] 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'
                        }`}
                      >
                        {approvals[member.id] ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                      </button>
                    </div>
                  ))}
                </div>
                {allApproved && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">All approvals granted</span>
                  </div>
                )}
              </div>

              {/* Contextual Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Marketing managers, 25-45"
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Campaign Objectives</label>
                  <textarea
                    value={campaignObjectives}
                    onChange={(e) => setCampaignObjectives(e.target.value)}
                    placeholder="Primary goals for this campaign..."
                    className="w-full h-16 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Internal Notes</label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private notes for team..."
                    className="w-full h-16 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Feedback & Comments Feed */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Feedback & Comments ({selectedPost.comments.length})</label>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                  {selectedPost.comments.map(comment => (
                    <div key={comment.id} className="bg-slate-50 p-2.5 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <img 
                          src={comment.author.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name)}&background=6366f1&color=fff&size=32`} 
                          alt={comment.author.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{comment.author.name}</p>
                          <p className="text-[10px] text-slate-400">{comment.author.role}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{comment.text}</p>
                    </div>
                  ))}
                  {selectedPost.comments.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No comments yet. Start the conversation.</p>
                  )}
                </div>
                
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={handleSaveEditorChanges}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Empty state for collab panel when no post selected */}
      {isCollabPanelOpen && !selectedPost && (
        <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-screen shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Campaign</span>
            <button
              onClick={() => setIsCollabPanelOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">No Post Selected</p>
              <p className="text-xs text-slate-500">Select a post from the dashboard to view and edit details.</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}