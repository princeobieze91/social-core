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
  PanelRightClose
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import LoginRegister from "./components/LoginRegister";
import OAuthConsent from "./components/OAuthConsent";
import { SocialPost, TeamMember, PostComment, ActiveView, PostAttachment } from "./types";
import { INITIAL_POSTS, INITIAL_TEAM_MEMBERS, PLATFORMS_CONFIG, WORKSPACES } from "./mockData";
import { supabase } from "./supabaseClient";

export default function App() {
  // --- Persistent & UI States ---
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    const saved = localStorage.getItem("socialcore_user_session");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });

  const [posts, setPosts] = useState<SocialPost[]>(() => {
    const saved = localStorage.getItem("socialcore_posts");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_POSTS;
  });

  const [currentWorkspace, setCurrentWorkspace] = useState("ws-acme");
  const [actingUser, setActingUser] = useState<TeamMember>(() => {
    const saved = localStorage.getItem("socialcore_user_session");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_TEAM_MEMBERS[0];
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("socialcore_auth_token");
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileCollabOpen, setIsMobileCollabOpen] = useState(false);
  const [consentProvider, setConsentProvider] = useState<string | null>(null);
  
  // Bulk selection list check state
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("calendar");
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection state for detail/collaboration sidebar
  const [selectedPostId, setSelectedPostId] = useState<string>(INITIAL_POSTS[0]?.id || "");
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
      const state = params.get("state");

      const savedState = localStorage.getItem("auth0_state");
      if (state && savedState && state === savedState) {
        localStorage.removeItem("auth0_state");
        localStorage.removeItem("auth0_nonce");

        window.history.replaceState({}, "", window.location.pathname);

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
              }
            })
            .catch(e => console.error("Auth0 login failed:", e));
        }
      }
    }
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    localStorage.setItem("socialcore_posts", JSON.stringify(posts));
  }, [posts]);

  // Sync post selection details if posts list updates
  useEffect(() => {
    if (posts.length > 0 && !posts.some(p => p.id === selectedPostId)) {
      setSelectedPostId(posts[0].id);
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
    // Start calendar from Monday of current week
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
    // Simulated separation: We distribute posts with tags or name associations to simulate high fidelity workspace selection
    const matchesWorkspace = 
      currentWorkspace === "ws-tech" ? post.tags.includes("Thought Leadership") || post.platforms.includes("linkedin") || post.platforms.includes("twitter") :
      currentWorkspace === "ws-solis" ? post.platforms.includes("instagram") || post.platforms.includes("tiktok") :
      true; // ws-acme sees all

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
    
    // Set scheduled time to tomorrow at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Format to local ISO-like correct format for input element
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
    // Format date string safely for local datetime input
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

  // Submit Post Form (Create or Write-back)
  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;

    const postToSave: SocialPost = {
      id: editingPost ? editingPost.id : "post-" + Date.now(),
      title: formTitle,
      content: formContent,
      platforms: formPlatforms,
      status: editingPost ? editingPost.status : "draft",
      scheduledAt: new Date(formScheduledAt).toISOString(),
      attachments: formAttachments,
      tags: formTags,
      comments: editingPost ? editingPost.comments : [],
      logs: editingPost 
        ? [
            ...editingPost.logs, 
            {
              id: "log-" + Date.now(),
              user: { name: actingUser.name, role: actingUser.role },
              action: `Modified post attributes`,
              timestamp: new Date().toISOString()
            }
          ]
        : [
            {
              id: "log-" + Date.now(),
              user: { name: actingUser.name, role: actingUser.role },
              action: `Created new draft`,
              timestamp: new Date().toISOString()
            }
          ]
    };

    if (editingPost) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? postToSave : p));
    } else {
      setPosts(prev => [postToSave, ...prev]);
      setSelectedPostId(postToSave.id);
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

  // Delete post completely
  const handleDeletePost = (id: string) => {
    if (confirm("Are you sure you want to delete this planned post candidate?")) {
      setPosts(prev => prev.filter(p => p.id !== id));
      setSelectedPostIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  // --- Bulk Actions Operations ---
  const handleMassApprove = () => {
    if (selectedPostIds.length === 0) return;
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
    setSelectedPostIds([]);
    alert("Selected campaign drafts have been approved successfully!");
  };

  const handleBatchDelete = () => {
    if (selectedPostIds.length === 0) return;
    if (confirm(`Are you sure you want to batch delete these ${selectedPostIds.length} campaigns?`)) {
      setPosts(prev => prev.filter(p => !selectedPostIds.includes(p.id)));
      setSelectedPostIds([]);
    }
  };

  const handleBulkReschedule = (targetDateStr: string) => {
    if (!targetDateStr) return;
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
      
      // Map beautiful avatars for review feedback representation
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

      // Automatically change status based on reviewer feedback to simulate natural workflow
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

    } catch (e: any) {
      console.error(e);
      alert("AI Reviewer failed to generate response: " + e.message);
    } finally {
      setAiReviewerLoading(null);
    }
  };

  // Add general text comment from currently logged-in actor
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;

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
  };

  // Planable status/approval pipelines
  const handleUpdateStatus = (status: 'draft' | 'pending' | 'approved' | 'scheduled' | 'published') => {
    if (!selectedPost) return;
    
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
        return {
          ...p,
          status,
          logs: updatedLogs
        };
      }
      return p;
    }));
  };

  // Re-schedule day helper via calendar interaction
  const handleReschedule = (postId: string, dateStr: string) => {
    const postToChg = posts.find(p => p.id === postId);
    if (!postToChg) return;

    // Preserve the original hours/minutes
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
        return {
          ...p,
          scheduledAt: newTargetDate.toISOString(),
          logs: updatedLogs
        };
      }
      return p;
    }));
  };

  // Helper renderer to represent active platforms on cards
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

  // Helper status color indicator
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

  if (consentProvider) {
    return <OAuthConsent provider={consentProvider} onBack={() => { setConsentProvider(null); window.history.replaceState({}, "", "/"); }} />;
  }

  if (!currentUser) {
    return <LoginRegister onLoginSuccess={(u, t) => { setCurrentUser(u); setAuthToken(t || null); }} />;
  }

  return (
    <div className="flex h-screen bg-[#f1f5f9] select-none overflow-hidden font-sans text-slate-900">
      
      {/* 1. Bento Sidebar navigation component */}
      <Sidebar 
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        actingUser={actingUser}
        setActingUser={setActingUser}
        activeView={activeView}
        setActiveView={setActiveView}
        selectedPlatformFilter={selectedPlatformFilter}
        setSelectedPlatformFilter={setSelectedPlatformFilter}
        postsCount={postCountsObj}
        onSignOut={() => { setCurrentUser(null); setAuthToken(null); }}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Bento container: Header + dynamic Grid view */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header Section */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-display font-semibold text-slate-800">
              <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Social</span>Core Hub
            </h1>

            {/* Quick Stats bar inside Header */}
            <div className="hidden lg:flex items-center gap-4 border-l border-slate-200 pl-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <strong>{posts.length}</strong> Active scheduled posts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <strong>{postCountsObj.approved + postCountsObj.scheduled}</strong> Brand Approved
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Search Bar */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-posts-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns, tags..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Simulated Live Workspace members status indicator row */}
            <div className="flex -space-x-2 mr-2">
              {INITIAL_TEAM_MEMBERS.map(member => (
                <img 
                  key={member.id}
                  src={member.avatarUrl} 
                  title={`${member.name} (${member.role}) ${member.status === 'active' ? '● Online' : ''}`}
                  className="w-7 h-7 rounded-full border-2 border-white object-cover"
                  alt={member.name}
                />
              ))}
            </div>

            {/* Primary Action Button */}
            <button
              id="btn-create-post-header"
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Campaign</span>
            </button>
          </div>
        </header>

        {/* Outer Main Bento Box View Wrapper */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">
          
          {/* Active Workspace Banner Widget */}
          <div className="mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-1 bg-indigo-50 rounded-lg">
                {WORKSPACES.find(w => w.id === currentWorkspace)?.logo || "🚀"}
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {WORKSPACES.find(w => w.id === currentWorkspace)?.name}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {WORKSPACES.find(w => w.id === currentWorkspace)?.description}
                </p>
              </div>
            </div>

            {/* Workspace action guidelines */}
            <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-[11px] text-indigo-900 font-medium max-w-sm">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Simulate client sign-offs by selecting comments, clicking approvals or invoking specialized smart <strong>AI Peer Reviewers</strong>.</span>
            </div>
          </div>

          {/* DYNAMIC VIEWS GRID CELLS */}

          {/* View Mode: CALENDAR scheduler */}
          {activeView === "calendar" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Planable Content Calendar (Weekly Grid View)
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Select a day grid item below to simulate drag-drop reschedule assignment.
                </span>
              </div>

              {/* Grid week row */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5">
                {weekDays.map((dayDate, index) => {
                  const dayDateISOString = dayDate.toDateString();
                  const postsOnThisDay = filteredPostsByWorkspaceAndPlatform.filter(post => {
                    return new Date(post.scheduledAt).toDateString() === dayDateISOString;
                  });

                  const isToday = new Date().toDateString() === dayDateISOString;

                  return (
                    <div 
                      key={index} 
                      className={`bg-white border rounded-xl p-3 min-h-[340px] flex flex-col transition-all duration-200 ${
                        isToday 
                          ? "ring-2 ring-indigo-500/20 border-indigo-300" 
                          : "border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Day Heading */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-700">
                          {dayDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isToday ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {dayDate.getDate()}
                        </span>
                      </div>

                      {/* Posts Stacked */}
                      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                        {postsOnThisDay.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-slate-100 rounded-lg text-[10px] text-slate-400 font-medium">
                            No posts scheduled
                          </div>
                        ) : (
                          postsOnThisDay.map(post => {
                            const isSelected = selectedPostId === post.id;
                            const statusInfo = getStatusStyle(post.status);
                            return (
                              <div
                                key={post.id}
                                onClick={() => setSelectedPostId(post.id)}
                                className={`group p-2.5 border rounded-lg text-left cursor-pointer transition-all duration-150 relative ${
                                  isSelected 
                                    ? "bg-slate-50 border-indigo-500 shadow-sm ring-1 ring-indigo-200" 
                                    : "bg-white hover:bg-slate-50 border-slate-200"
                                }`}
                              >
                                {/* Platform bar indicator */}
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {post.platforms.map(platformId => {
                                    const plat = PLATFORMS_CONFIG.find(p => p.id === platformId);
                                    return (
                                      <span 
                                        key={platformId} 
                                        className={`w-2 h-2 rounded-full ${plat?.color || "bg-slate-400"}`} 
                                        title={plat?.name}
                                      />
                                    );
                                  })}
                                </div>

                                <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                                  {post.title}
                                </h3>

                                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal font-sans">
                                  {post.content}
                                </p>

                                {/* Attachment Quick indicator */}
                                {post.attachments.length > 0 && (
                                  <div className="mt-2 flex items-center gap-1 text-[9px] text-indigo-600 font-semibold bg-indigo-50/50 px-1.5 py-0.5 rounded self-start border border-indigo-100/30">
                                    <FileImage className="w-2.5 h-2.5" />
                                    <span>+{post.attachments.length} Image Asset</span>
                                  </div>
                                )}

                                {/* Card Footer: Time + status */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400 font-semibold">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>

                                  <span className={`px-1 rounded-sm uppercase tracking-tight text-[9px] font-bold ${statusInfo.badge}`}>
                                    {statusInfo.text}
                                  </span>
                                </div>

                                {/* Simulated drag re-schedule overlay triggers */}
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(post);
                                    }}
                                    title="Edit post parameters" 
                                    className="bg-white hover:bg-slate-100 border border-slate-200 p-1 rounded hover:text-indigo-600"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePost(post.id);
                                    }}
                                    title="Delete post candidate" 
                                    className="bg-white hover:bg-red-50 border border-slate-200 p-1 rounded hover:text-red-500"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Day simulator reschedule picker */}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <select
                          className="w-full text-[9px] font-semibold text-slate-500 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-slate-200 rounded p-1 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleReschedule(e.target.value, dayDate.toISOString());
                              e.target.value = ""; // Reset
                            }
                          }}
                        >
                          <option value="">⚡ Move post here...</option>
                          {posts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.title.substring(0, 15)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Mode: STREAM FEED mock social card renderer */}
          {activeView === "feed" && (
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Stream Feed previews across simulated platforms
                </span>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">
                  {filteredPostsByWorkspaceAndPlatform.length} Posts Loaded
                </span>
              </div>

              {filteredPostsByWorkspaceAndPlatform.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                  <p className="font-semibold text-sm">No social candidates matched the current workspace filters.</p>
                  <button onClick={handleOpenCreateModal} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                    Create A Post Draft
                  </button>
                </div>
              ) : (
                filteredPostsByWorkspaceAndPlatform.map(post => {
                  const statusInfo = getStatusStyle(post.status);
                  const isSelected = selectedPostId === post.id;
                  
                  return (
                    <div 
                      key={post.id}
                      onClick={() => setSelectedPostId(post.id)}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                        isSelected 
                          ? "border-indigo-500 ring-2 ring-indigo-500/15 shadow-md" 
                          : "border-slate-200 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      {/* Sub header for internal metrics */}
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">{post.title}</span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusInfo.badge}`}>
                            {statusInfo.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            SCHEDULED: {new Date(post.scheduledAt).toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(post);
                            }}
                            className="text-xs text-slate-500 hover:text-indigo-600 p-1"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* SIMULATED PLATFORM CHASSIS (We preview for the first primary platform designated) */}
                      {post.platforms.map(platformId => {
                        return (
                          <div key={platformId} className="p-5 border-b last:border-b-0 bg-slate-50/20">
                            <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-4">
                              
                              {/* Platform identifier header */}
                              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  {renderPlatformBadgeIcon(platformId)}
                                  <span className="text-[11px] text-slate-400 font-mono">Live Simulation Mockup</span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">Acme Corp Brand Pool</span>
                              </div>

                              {/* Realistic Profile Metadata */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                  <img 
                                    src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=150" 
                                    alt="Brand Avatar" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 text-xs">Acme Corporation</span>
                                    <span className="text-[10px] text-indigo-500">✓</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    @acmecorp • Just now • {platformId.toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              {/* Body Copy Text */}
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed leading-6 mb-4">
                                {post.content}
                              </p>

                              {/* Image or Video attachments preview */}
                              {post.attachments.map(att => (
                                <div key={att.id} className="mb-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                  {att.type.startsWith("video") ? (
                                    <div className="relative aspect-video bg-neutral-900 flex flex-col items-center justify-center text-white">
                                      <Video className="w-12 h-12 text-slate-300 animate-pulse mb-2" />
                                      <span className="text-xs font-mono bg-black/60 px-3 py-1 rounded font-bold">{att.name}</span>
                                      <span className="text-[10px] text-slate-400 mt-1">Video Stream Controller Simulator</span>
                                    </div>
                                  ) : (
                                    <img 
                                      src={att.url} 
                                      alt={att.name}
                                      className="w-full max-h-[340px] object-cover"
                                      onError={(e) => {
                                        // Fallback if unsplash image fails or simulated url is empty
                                        e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800";
                                      }}
                                    />
                                  )}
                                  <div className="bg-slate-50 px-3 py-1.5 flex justify-between items-center border-t border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-mono font-bold">{att.name}</span>
                                    <span className="text-[10px] text-xs text-slate-400 font-mono font-semibold">{att.size || "1.5 MB"}</span>
                                  </div>
                                </div>
                              ))}

                              {/* Engagement toolbar mockup */}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold font-sans">
                                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                                  <Heart className="w-4 h-4" />
                                  <span>248 Likes</span>
                                </button>
                                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.comments.length} Comments</span>
                                </button>
                                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                                  <Share2 className="w-4 h-4" />
                                  <span>Share Asset</span>
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* View Mode: INSTAGRAM GRID preview box */}
          {activeView === "grid" && (
            <div className="flex flex-col gap-4">
              <div className="border-b pb-2 flex justify-between items-center">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Instagram Grid Aesthetic Matcher
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Showing post layout previews filtering channels containing Instagram.
                </span>
              </div>

              {posts.filter(p => p.platforms.includes("instagram")).length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl text-slate-500 max-w-md mx-auto">
                  <p className="font-semibold text-sm">No posts scheduled for Instagram channel suite</p>
                  <button onClick={handleOpenCreateModal} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                    Pin Post to Instagram
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  
                  {/* Account Profile header mockup */}
                  <div className="flex items-center gap-6 pb-6 mb-6 border-b border-slate-100">
                    <img 
                      src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=150" 
                      className="w-16 h-16 rounded-full border border-slate-200 object-cover"
                      alt="Brand Account Avatar"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold text-slate-800">acme_corporation</span>
                      <div className="flex gap-4 text-xs font-medium text-slate-500">
                        <span><strong>16</strong> posts</span>
                        <span><strong>24.6k</strong> followers</span>
                        <span><strong>1.4k</strong> following</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Acme Corporation Sustainable Eco Tech 🌍</span>
                    </div>
                  </div>

                  {/* 3x3 Photo grid preview matching authentic style */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60" id="instagram-organic-grid">
                    {posts.filter(p => p.platforms.includes("instagram")).map(post => {
                      const imageAttach = post.attachments[0];
                      const statusInfo = getStatusStyle(post.status);
                      const isSelected = selectedPostId === post.id;

                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPostId(post.id)}
                          className={`aspect-square relative group bg-neutral-900 border overflow-hidden cursor-pointer ${
                            isSelected ? "ring-4 ring-indigo-500/50 border-white z-10" : "border-slate-200"
                          }`}
                        >
                          <img 
                            src={imageAttach?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"} 
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          
                          {/* Hover action and status cover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                            <span className={`self-start text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${statusInfo.badge}`}>
                              {statusInfo.text}
                            </span>

                            <div className="flex flex-col gap-0.5 text-white">
                              <span className="text-[10px] font-bold truncate">{post.title}</span>
                              <span className="text-[9px] font-mono text-slate-300">
                                {new Date(post.scheduledAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Mode: BULK LIST GRID view */}
          {activeView === "list" && (
            <div className="flex flex-col gap-4">
              
              {/* Optional Floating Bulk Action Header */}
              {selectedPostIds.length > 0 ? (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">⚙️</span>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">
                        Bulk Action Matrix Workspace
                      </h4>
                      <p className="text-[11px] text-indigo-700 font-medium">
                        You have selected <strong>{selectedPostIds.length}</strong> campaign posts. Apply batch changes across all targets:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Mass Approve Action */}
                    <button
                      id="btn-bulk-mass-approve"
                      onClick={handleMassApprove}
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mass Approve</span>
                    </button>

                    {/* Batch Delete Action */}
                    <button
                      id="btn-bulk-batch-delete"
                      onClick={handleBatchDelete}
                      type="button"
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Batch Delete</span>
                    </button>

                    {/* Bulk Reschedule Action */}
                    <div className="flex items-center gap-2 bg-white/80 border border-indigo-100 rounded-xl p-1 px-2.5 text-xs text-slate-700">
                      <span className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider font-mono">Reschedule:</span>
                      <input 
                        type="datetime-local" 
                        id="bulk-target-reschedule-time" 
                        required
                        className="bg-white border border-slate-200 rounded text-[11px] p-1 px-2 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-800"
                      />
                      <button
                        id="btn-bulk-apply-scheduling"
                        onClick={() => {
                          const input = document.getElementById("bulk-target-reschedule-time") as HTMLInputElement;
                          if (input && input.value) {
                            handleBulkReschedule(input.value);
                          } else {
                            alert("Please select a target date & time first.");
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Apply Time
                      </button>
                    </div>

                    {/* Cancel Selection */}
                    <button
                      onClick={() => setSelectedPostIds([])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 hover:underline"
                    >
                      Cancel Selection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/40 border border-indigo-100/40 p-3 rounded-xl text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tip: select multiple rows below using checkboxes to trigger Mass Approvals, Batch Deletions, or Group Rescheduling in one click.</span>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                    Bulk Planner List Matrix
                  </span>
                  <div className="flex items-center gap-3">
                    {selectedPostIds.length > 0 && (
                      <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                        {selectedPostIds.length} Selected
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-semibold font-mono">
                      Rows: {filteredPostsByWorkspaceAndPlatform.length} entries
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="bulk-list-table">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 text-xs font-bold">
                        {/* Checkbox Selector Heading */}
                        <th className="p-3 pl-4 w-12 text-center">
                          <input 
                            id="checkbox-select-all-posts"
                            type="checkbox" 
                            checked={filteredPostsByWorkspaceAndPlatform.length > 0 && selectedPostIds.length === filteredPostsByWorkspaceAndPlatform.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPostIds(filteredPostsByWorkspaceAndPlatform.map(p => p.id));
                              } else {
                                setSelectedPostIds([]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 pl-2">Campaign Title</th>
                        <th className="p-3">Destinations</th>
                        <th className="p-3">Workflow State</th>
                        <th className="p-3">Target Date/Time</th>
                        <th className="p-3 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredPostsByWorkspaceAndPlatform.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No posts planned matching current channels or search query.
                          </td>
                        </tr>
                      ) : (
                        filteredPostsByWorkspaceAndPlatform.map(post => {
                          const isSelected = selectedPostId === post.id;
                          const isChecked = selectedPostIds.includes(post.id);
                          const statusInfo = getStatusStyle(post.status);
                          return (
                            <tr 
                              key={post.id}
                              onClick={() => setSelectedPostId(post.id)}
                              className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                isChecked ? "bg-indigo-50/20" : isSelected ? "bg-slate-50/50" : ""
                              }`}
                            >
                              {/* Row Checkbox SelectorCell */}
                              <td className="p-3 pl-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  id={`checkbox-select-post-${post.id}`}
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPostIds(prev => [...prev, post.id]);
                                    } else {
                                      setSelectedPostIds(prev => prev.filter(id => id !== post.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              
                              <td className="p-3 pl-2 font-bold text-slate-800">
                                <div className="flex flex-col">
                                  <span>{post.title}</span>
                                  <span className="text-[10px] text-slate-400 truncate max-w-sm font-normal mt-0.5">{post.content}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {post.platforms.map(platformId => (
                                    <span key={platformId} className="text-[10px] uppercase font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                      {platformId}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full uppercase text-[9px] font-bold ${statusInfo.badge}`}>
                                  {statusInfo.text}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-500">
                                {new Date(post.scheduledAt).toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3 text-right pr-4">
                                <div className="inline-flex gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(post);
                                    }}
                                    className="text-xs bg-white hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 px-2 py-1 rounded"
                                  >
                                    Edit Info
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePost(post.id);
                                    }}
                                    className="text-xs bg-white hover:bg-red-50 hover:text-red-500 border border-slate-200 px-2 py-1 rounded"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3. Team Collaboration, approvals & AI reviewer Sidebar Panel */}
      <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-screen shrink-0 font-sans shadow-sm" id="collab-panel">
        
        {/* Detail Panel Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Campaign Block</span>
            <span className="font-display font-semibold text-xs text-slate-800 line-clamp-1">
              {selectedPost ? selectedPost.title : "No post selected"}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 font-mono">Feedback Stream</span>
        </div>

        {/* Selected Post Overview */}
        {selectedPost ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* Quick action state locker for Client approval simulations */}
            <div className="p-4 border-b border-indigo-100 bg-indigo-50/20">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2.5 block">
                Workflow Approval Sign-off
              </label>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-approve-post"
                  onClick={() => handleUpdateStatus("approved")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    selectedPost.status === "approved"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approved (Client)</span>
                </button>

                <button
                  id="btn-lock-post"
                  onClick={() => handleUpdateStatus("scheduled")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    selectedPost.status === "scheduled"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked & Ready</span>
                </button>
              </div>

              {/* Reset to draft option */}
              {selectedPost.status !== "draft" && (
                <button
                  onClick={() => handleUpdateStatus("draft")}
                  className="w-full text-center mt-2 text-[10px] text-slate-500 hover:text-indigo-600 font-medium underline"
                >
                  Revert status to Draft Planning
                </button>
              )}
            </div>

            {/* AI SYSTEM REVIEW PANEL (COLLABORATOR SIMULATORS) */}
            <div className="p-4 border-b border-rose-100 bg-rose-50/25">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 focus:outline-none">
                  <Sparkles className="w-3 h-3 text-rose-500" />
                  <span>AI Expert Reviewers Pool</span>
                </span>
                <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 font-bold px-1.5 py-0.2 rounded">
                  Gemini Flash 3
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mb-3">
                Click an expert to get instant feedback commentary and dynamic copy suggestions.
              </p>

              {/* 4 buttons representing simulated agencies */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-ai-jane"
                  onClick={() => handleTriggerPersonaReview("jane")}
                  disabled={!!aiReviewerLoading}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-left text-xs font-semibold focus:outline-none disabled:opacity-50"
                >
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=40" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" alt="Jane" />
                  <div className="truncate">
                    <span className="text-[10px] block font-bold text-slate-700">Jane (Client)</span>
                    <span className="text-[9px] text-slate-400 font-medium truncate block">
                      {aiReviewerLoading === "jane" ? "Analyzing..." : "Brand Voice"}
                    </span>
                  </div>
                </button>

                <button
                  id="btn-ai-lucas"
                  onClick={() => handleTriggerPersonaReview("lucas")}
                  disabled={!!aiReviewerLoading}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-left text-xs font-semibold focus:outline-none disabled:opacity-50"
                >
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=40" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" alt="Lucas" />
                  <div className="truncate">
                    <span className="text-[10px] block font-bold text-slate-700">Lucas (SEO)</span>
                    <span className="text-[9px] text-slate-400 font-medium truncate block">
                      {aiReviewerLoading === "lucas" ? "Optimizing..." : "Hooks & Reach"}
                    </span>
                  </div>
                </button>

                <button
                  id="btn-ai-elena"
                  onClick={() => handleTriggerPersonaReview("elena")}
                  disabled={!!aiReviewerLoading}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-left text-xs font-semibold focus:outline-none disabled:opacity-50"
                >
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=40" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" alt="Elena" />
                  <div className="truncate">
                    <span className="text-[10px] block font-bold text-slate-700">Elena (CD)</span>
                    <span className="text-[9px] text-slate-400 font-medium truncate block">
                      {aiReviewerLoading === "elena" ? "Designing..." : "Aesthetic Tone"}
                    </span>
                  </div>
                </button>

                <button
                  id="btn-ai-dave"
                  onClick={() => handleTriggerPersonaReview("dave")}
                  disabled={!!aiReviewerLoading}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-left text-xs font-semibold focus:outline-none disabled:opacity-50"
                >
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40" className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" alt="Dave" />
                  <div className="truncate">
                    <span className="text-[10px] block font-bold text-slate-700">Dave (Writer)</span>
                    <span className="text-[9px] text-slate-400 font-medium truncate block">
                      {aiReviewerLoading === "dave" ? "Correcting..." : "Proofreader"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* FEEDBACK COMMENT THREADS & AUDIT LOG FLOW */}
            <div className="p-4 flex-1 flex flex-col gap-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Collaboration thread ({selectedPost.comments.length})
              </span>

              {/* Thread list */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                {selectedPost.comments.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                    No comments yet. Request review by tagging coworkers or running an AI agent above.
                  </div>
                ) : (
                  [...selectedPost.comments].reverse().map(comment => (
                    <div key={comment.id} className="flex gap-2.5 items-start text-xs leading-relaxed">
                      <img 
                        src={comment.author.avatarUrl} 
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100 mt-0.5" 
                        alt={comment.author.name}
                      />
                      <div className="flex-1 min-w-0 bg-slate-50 hover:bg-slate-100/70 py-2 px-3 rounded-tr-xl rounded-b-xl border border-slate-200/50">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-[11px] truncate">
                            {comment.author.name}
                          </span>
                          <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-5">{comment.text}</p>

                        {/* Rendering dynamic suggestions from AI models */}
                        {comment.suggestions && comment.suggestions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-100/60 flex flex-col gap-1 text-[10px] text-slate-500 font-semibold font-sans">
                            <span className="text-indigo-600 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Core Action Suggestions:
                            </span>
                            <ul className="list-disc pl-3.5 space-y-0.5 text-[10px] text-slate-600 list-outside">
                              {comment.suggestions.map((s, idx) => (
                                <li key={idx}>
                                  <button
                                    onClick={() => {
                                      // Quickly suggest rewriting text inline
                                      if (confirm(`Do you wish to insert suggestion: "${s}"?`)) {
                                        setFormContent(prev => prev + `\n\n- ${s}`);
                                        alert("Suggestion appended to buffer draft. Open Compose modal to review.");
                                      }
                                    }}
                                    className="text-left hover:underline text-slate-700 hover:text-indigo-600 font-medium"
                                  >
                                    {s}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Audit Trial activity history logs inside Bento pipeline */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Campaign History Log</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono font-bold">Audit Trail</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedPost.logs.map(log => (
                      <div key={log.id} className="text-[10px] text-slate-500 font-medium">
                        <span className="font-bold text-slate-700">{log.user.name}</span>
                        <span className="mx-1 text-slate-400">{log.action}</span>
                        <span className="text-[9px] text-slate-300 font-mono font-normal">
                          ({new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Submit regular human comments */}
              <form onSubmit={handleAddComment} className="mt-auto pt-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ask a question or request revision..."
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="bg-indigo-600 text-white p-2 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-all font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center text-xs">
            No planned posts are established. Composed drafts will display review boards here.
          </div>
        )}
      </aside>

      {/* ============================================================== */}
      {/* CREATION & AI OPTIMIZER modal box (Rich Overlay Chassis) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden font-sans">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  {editingPost ? "Modify Social Campaign Asset" : "Compose Multi-Platform Social Campaign"}
                </h3>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSavePost} className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Form entries on the left */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 border-r border-slate-100">
                
                {/* Campaign Title & Metadata tagging */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Campaign Header Label</label>
                  <input
                    id="form-post-title"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter short internal campaign reference..."
                    className="px-3 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs text-slate-800 font-semibold"
                  />
                </div>

                {/* Platform channels selectors */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target Social Outlets</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS_CONFIG.map(plat => {
                      const isSelected = formPlatforms.includes(plat.id);
                      return (
                        <button
                          id={`btn-select-platform-${plat.id}`}
                          key={plat.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormPlatforms(prev => prev.filter(p => p !== plat.id));
                            } else {
                              setFormPlatforms(prev => [...prev, plat.id]);
                            }
                          }}
                          className={`flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white" 
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{plat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Draft text copy and character count */}
                <div className="flex flex-col gap-1 relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Post Caption Draft Narrative</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Chars: {formContent.length}
                    </span>
                  </div>

                  <textarea
                    id="form-post-content"
                    required
                    rows={6}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Engaging copy text starting with hooks and emojis..."
                    className="p-3 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs text-slate-800 font-sans leading-5 resize-none bg-slate-50/50 focus:bg-white"
                  />
                </div>

                {/* Asset references / attachments manager */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Campaign Media Assets</label>
                  
                  {/* List active attachments */}
                  <div className="flex flex-col gap-1.5">
                    {formAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🖼️</span>
                          <span className="font-bold text-slate-700 truncate max-w-xs">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add simulated asset link */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold">Image URL</span>
                      <input 
                        type="text" 
                        value={simulatedMediaUrl}
                        onChange={(e) => setSimulatedMediaUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... or base64"
                        className="p-1 px-2 border rounded bg-white text-[11px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold">Asset Label</span>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={simulatedMediaName}
                          onChange={(e) => setSimulatedMediaName(e.target.value)}
                          placeholder="promo_pack_photo.jpg"
                          className="p-1 px-2 border rounded bg-white text-[11px] flex-1"
                        />
                        <button 
                          type="button"
                          onClick={handleAddSimulatedAttachment}
                          className="bg-slate-900 text-white font-bold px-2 rounded font-mono text-[11px] shrink-0"
                        >
                          Attach
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    💡 Drag & drop mock: paste any unsplash image address to simulate visual placements perfectly.
                  </div>
                </div>

                {/* Scheduling timestamp & workspace custom tags */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Scheduled Time Date</label>
                    <input
                      id="form-post-scheduled-at"
                      type="datetime-local"
                      required
                      value={formScheduledAt}
                      onChange={(e) => setFormScheduledAt(e.target.value)}
                      className="px-3 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs text-slate-700 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Category Tags</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formTagInput}
                        onChange={(e) => setFormTagInput(e.target.value)}
                        placeholder="Eco Launch"
                        className="px-2 py-1 border border-slate-200 rounded text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold"
                      >
                        + List
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {formTags.map(t => (
                        <span key={t} className="text-[10px] font-semibold bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 text-indigo-700 font-sans flex items-center gap-1">
                          {t}
                          <button type="button" onClick={() => handleRemoveTag(t)} className="font-extrabold text-[9px] text-indigo-400 hover:text-indigo-700">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Gemini AI optimizer utility on the right */}
              <div className="w-80 p-5 bg-slate-50/50 border-t md:border-t-0 flex flex-col gap-4 overflow-y-auto">
                <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-lg">
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  <span className="text-xs font-display font-semibold uppercase tracking-wider">Gemini Intelligent Assistant</span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Rewrite & Modify Draft with AI</span>
                  <p className="text-[10px] text-slate-500 font-medium">Select your desired styling transformation process and watch characters refine instantly:</p>
                  
                  <div className="flex flex-col gap-1.5">
                    <button
                      id="ai-action-expand"
                      type="button"
                      disabled={aiAssistantLoading}
                      onClick={() => handleOptimizeWithGemini("expand")}
                      className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-2 text-left text-xs text-slate-700 font-semibold flex items-center justify-between"
                    >
                      <span>✨ Expand & Enrich Copy</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      id="ai-action-shorten"
                      type="button"
                      disabled={aiAssistantLoading}
                      onClick={() => handleOptimizeWithGemini("shorten")}
                      className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-2 text-left text-xs text-slate-700 font-semibold flex items-center justify-between"
                    >
                      <span>✂️ Condense to Punchy Copy</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      id="ai-action-funny"
                      type="button"
                      disabled={aiAssistantLoading}
                      onClick={() => handleOptimizeWithGemini("make_funny")}
                      className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-2 text-left text-xs text-slate-700 font-semibold flex items-center justify-between"
                    >
                      <span>🤡 Infuse Wittiness & Emojis</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      id="ai-action-pro"
                      type="button"
                      disabled={aiAssistantLoading}
                      onClick={() => handleOptimizeWithGemini("make_professional")}
                      className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-2 text-left text-xs text-slate-700 font-semibold flex items-center justify-between"
                    >
                      <span>👔 Polish to thought-leadership</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Gemini Loading / output results pane */}
                {aiAssistantLoading && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span className="text-[10px] text-indigo-800 font-semibold">Gemini LLM is writing copy alternatives...</span>
                  </div>
                )}

                {aiAssistantJustification && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-sans leading-5 text-emerald-800">
                    <span className="font-bold block text-[11px] mb-1">AI Strategy Pitch:</span>
                    {aiAssistantJustification}
                  </div>
                )}

                {aiAssistantHashtags.length > 0 && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-800 block mb-1">AI Suggested Hashtags:</span>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {aiAssistantHashtags.map(tag => (
                        <span key={tag} className="text-[9px] font-mono font-bold bg-white text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyAiHashtags}
                      className="w-full bg-indigo-600 text-white font-semibold text-[10px] py-1.5 rounded-md hover:bg-indigo-700"
                    >
                      Intrude Hashtags Into Copy
                    </button>
                  </div>
                )}

                <div className="mt-auto bg-slate-100 p-2.5 rounded-lg text-[10px] text-slate-500 font-medium">
                  <strong>Collab Note:</strong> Real-time changes persist in Local Storage. Simulating approvals will trigger dynamic comments.
                </div>

              </div>

            </form>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-400 font-medium font-mono">SOCIALCORE INTEL PLANNED ENGINE</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 px-4 py-2 rounded-lg text-xs outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePost}
                  disabled={!formTitle || !formContent}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-sm disabled:opacity-50"
                >
                  Save & Queue Core Draft
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
