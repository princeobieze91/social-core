import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, X, Send, Image, Video, FileText, LogOut } from "lucide-react";
import LoginRegister from "./components/LoginRegister";
import { SocialPost, TeamMember, PostAttachment } from "./types";
import {
  apiGetPosts,
  apiCreatePost,
  apiUpdatePost,
  apiDeletePost,
  apiPublishPost,
  apiGetWorkspaces,
  apiGetChannels,
  apiDeleteChannel,
  apiMetaConnect,
  apiLinkedInAuth,
} from "./api";

export default function App() {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    const saved = localStorage.getItem("socialcore_user");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("socialcore_token");
  });

  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(["facebook"]);
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formAttachments, setFormAttachments] = useState<PostAttachment[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("socialcore_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("socialcore_user");
    }
  }, [currentUser]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("socialcore_token", authToken);
    } else {
      localStorage.removeItem("socialcore_token");
    }
  }, [authToken]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const idToken = hashParams.get("id_token");
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
              window.location.hash = "";
              window.location.replace(window.location.pathname);
            } else {
              console.error("Auth0 login failed:", data.error);
              window.location.hash = "";
            }
          })
          .catch(e => {
            console.error("Auth0 login failed:", e);
            window.location.hash = "";
          });
      } else {
        window.location.hash = "";
      }
    }
  }, []);

  // After login, auto-connect Meta page if pageId was passed via Facebook auth
  useEffect(() => {
    const autoConnect = async () => {
      if (!authToken || !currentUser) return;
      const pageId = localStorage.getItem("auth0_page_id");
      if (!pageId) return;
      try {
        await apiMetaConnect(pageId);
        localStorage.removeItem("auth0_page_id");
      } catch (e) {
        console.error("Auto-connect Meta failed:", e);
      }
    };
    autoConnect();
  }, [authToken, currentUser]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!authToken) return;
      try {
        const { workspaces: ws } = await apiGetWorkspaces();
        setWorkspaces(ws);
        if (ws.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(ws[0].id);
        }
      } catch (e) {
        console.error("Failed to load workspaces:", e);
      }
    };
    loadWorkspaces();
  }, [authToken]);

  useEffect(() => {
    const loadChannels = async () => {
      if (!selectedWorkspaceId || !authToken) return;
      try {
        const { channels: ch } = await apiGetChannels(selectedWorkspaceId);
        setChannels(ch);
      } catch (e) {
        console.error("Failed to load channels:", e);
      }
    };
    loadChannels();
  }, [selectedWorkspaceId, authToken]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!selectedWorkspaceId || !authToken) return;
      try {
        const { posts: apiPosts } = await apiGetPosts(selectedWorkspaceId);
        if (apiPosts && apiPosts.length > 0) {
          const normalized: SocialPost[] = apiPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            platforms: p.platforms || ["facebook"],
            status: p.status || "draft",
            scheduledAt: p.scheduled_at || p.created_at,
            attachments: (p.attachments || []).map((a: any) => ({
              id: a.id, name: a.name, type: a.type, url: a.url, size: a.size,
            })),
            comments: [],
            logs: [],
            tags: [],
          }));
          setPosts(normalized);
          setLastUpdated(new Date());
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Failed to load posts:", error);
      }
    };
    loadPosts();
    const interval = setInterval(loadPosts, 30000);
    return () => clearInterval(interval);
  }, [selectedWorkspaceId, authToken]);

  useEffect(() => {
    localStorage.setItem("socialcore_posts", JSON.stringify(posts));
  }, [posts]);

  const postCountsObj = {
    draft: posts.filter(p => p.status === "draft").length,
    pending: posts.filter(p => p.status === "pending").length,
    approved: posts.filter(p => p.status === "approved").length,
    scheduled: posts.filter(p => p.status === "scheduled").length,
    published: posts.filter(p => p.status === "published").length,
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesSearch;
  });

  const handleOpenModal = (post?: SocialPost) => {
    if (post) {
      setEditingPost(post);
      setFormTitle(post.title);
      setFormContent(post.content);
      setFormPlatforms(post.platforms);
      const d = new Date(post.scheduledAt);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setFormScheduledAt(localISO);
      setFormAttachments([...post.attachments]);
    } else {
      setEditingPost(null);
      setFormTitle("");
      setFormContent("");
      setFormPlatforms(["facebook"]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const localISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setFormScheduledAt(localISO);
      setFormAttachments([]);
    }
    setIsModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;
    if (!selectedWorkspaceId) {
      alert("No workspace selected");
      return;
    }
    const scheduledISO = new Date(formScheduledAt).toISOString();
    if (editingPost) {
      const optimistic: SocialPost = {
        ...editingPost,
        title: formTitle,
        content: formContent,
        platforms: formPlatforms,
        scheduledAt: scheduledISO,
        attachments: formAttachments,
        logs: [...editingPost.logs, {
          id: "log-" + Date.now(),
          user: { name: currentUser?.name || "User", role: currentUser?.role || "" },
          action: "Updated post",
          timestamp: new Date().toISOString(),
        }],
      };
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? optimistic : p)));
      try {
        await apiUpdatePost(editingPost.id, {
          title: formTitle,
          content: formContent,
          platforms: formPlatforms,
          scheduled_at: scheduledISO,
        });
        setLastUpdated(new Date());
      } catch { }
    } else {
      const tempId = "post-" + Date.now();
      const newPost: SocialPost = {
        id: tempId,
        title: formTitle,
        content: formContent,
        platforms: formPlatforms,
        status: "draft",
        scheduledAt: scheduledISO,
        attachments: formAttachments,
        comments: [],
        logs: [{
          id: "log-" + Date.now(),
          user: { name: currentUser?.name || "User", role: currentUser?.role || "" },
          action: "Created new draft",
          timestamp: new Date().toISOString(),
        }],
        tags: [],
      };
      setPosts((prev) => [newPost, ...prev]);
      try {
        const { post: created } = await apiCreatePost(selectedWorkspaceId, {
          title: formTitle,
          content: formContent,
          platforms: formPlatforms,
          status: "draft",
          scheduled_at: scheduledISO,
          attachments: formAttachments,
        });
        if (created) {
          setPosts((prev) => prev.map((p) => p.id === tempId ? { ...p, id: created.id } : p));
        }
        setLastUpdated(new Date());
      } catch { }
    }
    setIsModalOpen(false);
  };

  const handleDeletePost = async (id: string) => {
    if (confirm("Delete this post?")) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setSelectedPostIds((prev) => prev.filter((selectedId) => selectedId !== id));
      try {
        await apiDeletePost(id);
        setLastUpdated(new Date());
      } catch { }
    }
  };

  const handleBulkPublish = async () => {
    if (selectedPostIds.length === 0) {
      alert("Select posts to publish");
      return;
    }
    setIsPublishing(true);
    const results = [];
    for (const postId of selectedPostIds) {
      const post = posts.find(p => p.id === postId);
      if (!post) continue;
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "publishing" as const } : p));
      try {
        const result = await apiPublishPost(postId);
        if (result.success) {
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "published" as const } : p));
          results.push(`✓ ${post.title}`);
        } else {
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: "failed" as const } : p));
          const errors = result.results.map((r: any) => `${r.platform}: ${r.error}`).join("; ");
          results.push(`✗ ${post.title}: ${errors}`);
        }
      } catch (e: any) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: post.status } : p));
        results.push(`✗ ${post.title}: ${e.message}`);
      }
    }
    setIsPublishing(false);
    setSelectedPostIds([]);
    setLastUpdated(new Date());
    alert("Bulk Publish Results:\n\n" + results.join("\n"));
  };

  const togglePostSelection = (id: string) => {
    setSelectedPostIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPostIds.length === filteredPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(filteredPosts.map(p => p.id));
    }
  };

  const handleLoginSuccess = (user: TeamMember, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setPosts([]);
    setSelectedPostIds([]);
    setShowSettings(false);
  };

  const handleDisconnectChannel = async (channelId: string) => {
    if (!confirm("Disconnect this channel?")) return;
    try {
      await apiDeleteChannel(channelId);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
    } catch (e) {
      console.error("Failed to disconnect channel:", e);
    }
  };

  const handleConnectMeta = async () => {
    const pageId = prompt("Enter Facebook Page ID or name:");
    if (!pageId || !selectedWorkspaceId) return;
    try {
      const result = await apiMetaConnect(pageId);
      alert(result.message || "Connected successfully");
      const { channels: ch } = await apiGetChannels(selectedWorkspaceId);
      setChannels(ch);
    } catch (e: any) {
      alert("Failed to connect Meta page: " + e.message);
    }
  };

  const handleConnectLinkedIn = async () => {
    if (!selectedWorkspaceId) {
      alert("No workspace selected");
      return;
    }
    try {
      await apiLinkedInAuth(selectedWorkspaceId);
    } catch (e) {
      console.error("LinkedIn connect error:", e);
    }
  };

  if (!currentUser) {
    return <LoginRegister onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">SocialCore</h1>
            <span className="text-xs text-slate-500">Multi-User Social Publisher</span>
            <span className="text-xs text-slate-400">Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowSettings(true)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              Settings
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{currentUser.name}</span>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-600"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">Connected Channels</div>
            <div className="flex gap-2 flex-wrap">
              {["facebook", "instagram", "linkedin"].map((platform) => {
                const channel = channels.find((c: any) => c.platform === platform);
                return (
                  <span key={platform} className={`text-xs px-2 py-1 rounded-full ${channel ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {platform} {channel ? "●" : "○"}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Total Posts</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{posts.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-slate-500">Ready to Publish</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{postCountsObj.approved + postCountsObj.scheduled}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Published</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{postCountsObj.published}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Create Post
              </button>
              <button onClick={handleBulkPublish} disabled={selectedPostIds.length === 0 || isPublishing} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="w-4 h-4" /> {isPublishing ? "Publishing..." : "Publish Selected"}
              </button>
              <button onClick={() => { if (confirm(`Delete ${selectedPostIds.length} selected posts?`)) { selectedPostIds.forEach(id => handleDeletePost(id)); } }} disabled={selectedPostIds.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedPostIds.length === filteredPosts.length && filteredPosts.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /> Select All
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedPostIds.length === filteredPosts.length && filteredPosts.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Platforms</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Media</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPosts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No posts yet. Click "Create Post" to get started.</td></tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedPostIds.includes(post.id)} onChange={() => togglePostSelection(post.id)} className="rounded border-slate-300" /></td>
                    <td className="px-4 py-3"><div><p className="text-sm font-medium text-slate-900">{post.title}</p><p className="text-xs text-slate-500 line-clamp-1">{post.content}</p></div></td>
                    <td className="px-4 py-3"><div className="flex gap-1">{post.platforms.map(p => <span key={p} className="text-xs bg-slate-100 px-2 py-0.5 rounded">{p}</span>)}</div></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : post.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700' : post.status === 'approved' ? 'bg-blue-50 text-blue-700' : post.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{post.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(post.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{post.attachments.length > 0 ? <div className="flex items-center gap-1 text-xs text-slate-600">{post.attachments[0].type.startsWith('image') ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}<span>{post.attachments.length}</span></div> : <span className="text-xs text-slate-400">None</span>}</td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenModal(post)} className="p-1 text-slate-400 hover:text-indigo-600" title="Edit"><FileText className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1 text-slate-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-2">Workspace</h3>
                <select value={selectedWorkspaceId} onChange={(e) => { setSelectedWorkspaceId(e.target.value); apiGetChannels(e.target.value).then(({ channels: ch }) => setChannels(ch)); }} className="w-full border border-slate-200 rounded-lg px-3 py-2">
                  {workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-slate-900">Channels</h3></div>
                {channels.length === 0 && <p className="text-xs text-slate-500 mb-2">No channels connected yet.</p>}
                <div className="space-y-2 mb-3">
                  {channels.map((ch: any) => (
                    <div key={ch.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div><div className="text-sm font-medium text-slate-900 capitalize">{ch.platform}</div><div className="text-xs text-slate-500">{ch.profile_name}</div></div>
                      <button onClick={() => handleDisconnectChannel(ch.id)} className="text-xs text-red-600 hover:text-red-700">Disconnect</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleConnectMeta} className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Connect Facebook/Instagram</button>
                  <button onClick={handleConnectLinkedIn} className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Connect LinkedIn</button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Facebook/Instagram uses Make.com webhook. LinkedIn uses OAuth.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editingPost ? "Edit Post" : "Create New Post"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePost} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Post title..." /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Content</label><textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} required rows={6} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Write your post content..." /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Platforms</label>
                <div className="flex gap-2">
                  {channels.map((ch: any) => (
                    <label key={ch.id} className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-slate-50 ${formPlatforms.includes(ch.platform) ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                      <input type="checkbox" checked={formPlatforms.includes(ch.platform)} onChange={(e) => { setFormPlatforms(prev => e.target.checked ? [...prev, ch.platform] : prev.filter((p) => p !== ch.platform)); }} className="rounded border-slate-300" />
                      <span className="text-sm capitalize">{ch.platform}</span>
                    </label>
                  ))}
                  {channels.length === 0 && <span className="text-xs text-slate-500">Connect channels in workspace settings</span>}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Schedule Date & Time</label><input type="datetime-local" value={formScheduledAt} onChange={(e) => setFormScheduledAt(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Media Attachments</label>
                <div className="space-y-2">
                  {formAttachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">{att.type.startsWith('image') ? <Image className="w-4 h-4 text-slate-400" /> : <Video className="w-4 h-4 text-slate-400" />}<span className="text-sm">{att.name}</span></div>
                      <button type="button" onClick={() => setFormAttachments(prev => prev.filter(a => a.id !== att.id))} className="p-1 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { const url = prompt("Enter media URL:"); const name = prompt("Enter file name:"); if (url && name) { setFormAttachments(prev => [...prev, { id: "att-" + Date.now(), name, type: name.endsWith(".mp4") ? "video/mp4" : "image/jpeg", url, size: "2.4 MB" }]); } }} className="w-full px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600">+ Add Media</button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingPost ? "Update" : "Create"} Post</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}