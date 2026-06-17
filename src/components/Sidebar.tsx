import React from "react";
import { 
  Calendar, 
  Layers, 
  Grid, 
  List, 
  CheckCircle, 
  Sparkles, 
  X
} from "lucide-react";
import { WORKSPACES, INITIAL_TEAM_MEMBERS, PLATFORMS_CONFIG } from "../mockData";
import { TeamMember, ActiveView } from "../types";

interface SidebarProps {
  currentWorkspace: string;
  setCurrentWorkspace: (id: string) => void;
  actingUser: TeamMember;
  setActingUser: (user: TeamMember) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedPlatformFilter: string | null;
  setSelectedPlatformFilter: (platform: string | null) => void;
  postsCount: {
    draft: number;
    pending: number;
    approved: number;
    scheduled: number;
    published: number;
  };
  onSignOut?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  currentWorkspace,
  setCurrentWorkspace,
  actingUser,
  setActingUser,
  activeView,
  setActiveView,
  selectedPlatformFilter,
  setSelectedPlatformFilter,
  postsCount,
  onSignOut,
  isMobileOpen,
  onMobileClose
}: SidebarProps) {
  const activeWorkspaceObj = WORKSPACES.find(w => w.id === currentWorkspace) || WORKSPACES[0];

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg">
              {activeWorkspaceObj.logo}
            </span>
            <div className="flex flex-col">
              <span className="font-display font-semibold text-slate-800 text-sm leading-tight">
                {activeWorkspaceObj.name}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Workplace Environment</span>
            </div>
          </div>
          {onMobileClose && (
            <button onClick={onMobileClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-lg">
          {WORKSPACES.map(ws => (
            <button
              key={ws.id}
              onClick={() => { setCurrentWorkspace(ws.id); onMobileClose?.(); }}
              className={`text-xs py-1.5 px-1 rounded-md text-center transition-all ${
                currentWorkspace === ws.id 
                  ? "bg-white text-indigo-600 font-semibold shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title={ws.name}
            >
              {ws.logo} {ws.id.split("-")[1].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">
          Acting Team Role
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white px-2.5 py-2 border border-slate-200 rounded-lg shadow-xs">
            <img 
              src={actingUser.avatarUrl} 
              alt={actingUser.name} 
              className="w-8 h-8 rounded-full object-cover border border-indigo-50 shrink-0"
            />
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-semibold text-slate-700 truncate">{actingUser.name}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full self-start font-semibold mt-0.5 ${
                actingUser.role === 'Admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                actingUser.role === 'Manager' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                actingUser.role === 'Client' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                {actingUser.role}
              </span>
            </div>
          </div>

          <select
            value={actingUser.id}
            onChange={(e) => {
              const selected = INITIAL_TEAM_MEMBERS.find(t => t.id === e.target.value);
              if (selected) setActingUser(selected);
            }}
            className="text-xs cursor-pointer border border-slate-200 rounded-md p-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            {INITIAL_TEAM_MEMBERS.map(t => (
              <option key={t.id} value={t.id}>
                Simulate as: {t.name} ({t.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1 border-b border-slate-100">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2.5 mb-1 block">
          Workspace Views
        </span>

        <button
          onClick={() => { setActiveView('calendar'); onMobileClose?.(); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'calendar' 
              ? "bg-indigo-50 text-indigo-600 font-semibold shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeView === 'calendar' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Calendar Grid</span>
          <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">
            {postsCount.draft + postsCount.pending + postsCount.approved + postsCount.scheduled}
          </span>
        </button>

        <button
          onClick={() => { setActiveView('feed'); onMobileClose?.(); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'feed' 
              ? "bg-indigo-50 text-indigo-600 font-semibold shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Layers className={`w-4 h-4 ${activeView === 'feed' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Stream Feed Preview</span>
        </button>

        <button
          onClick={() => { setActiveView('grid'); onMobileClose?.(); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'grid' 
              ? "bg-indigo-50 text-indigo-600 font-semibold shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Grid className={`w-4 h-4 ${activeView === 'grid' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Instagram Grid</span>
        </button>

        <button
          onClick={() => { setActiveView('list'); onMobileClose?.(); }}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'list' 
              ? "bg-indigo-50 text-indigo-600 font-semibold shadow-xs" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <List className={`w-4 h-4 ${activeView === 'list' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Bulk List Grid</span>
        </button>
      </div>

      <div className="p-3 flex flex-col gap-1 border-b border-slate-100">
        <div className="flex items-center justify-between px-2.5 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Channels Filter
          </span>
          {selectedPlatformFilter && (
            <button 
              onClick={() => setSelectedPlatformFilter(null)}
              className="text-[10px] text-indigo-600 font-bold hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          {PLATFORMS_CONFIG.map(platform => {
            const isSelected = selectedPlatformFilter === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatformFilter(isSelected ? null : platform.id)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-all ${
                  isSelected 
                    ? "bg-slate-100 text-slate-950 font-bold shadow-xs" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${platform.color}`} />
                <span className="truncate">{platform.name}</span>
                {isSelected && <span className="ml-auto text-indigo-600 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 mt-auto">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 block">
          Workflows Pipeline
        </label>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Drafts</span>
            </div>
            <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.2 rounded-md font-bold text-slate-700">
              {postsCount.draft}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Pending Reviews</span>
            </div>
            <span className="font-mono text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded-md font-bold">
              {postsCount.pending}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Approved & Locked</span>
            </div>
            <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-md font-bold">
              {postsCount.approved}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Scheduled Auto</span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-md font-bold">
              {postsCount.scheduled}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono font-bold tracking-tight">
            <span><span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Social</span>Core Pro</span>
            <span className="text-indigo-500 animate-pulse">● Connected</span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="mt-1 w-full text-center text-[11px] text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out Account
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200 bg-white flex-col h-screen shrink-0 font-sans">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-slate-200 flex flex-col font-sans z-50 shadow-2xl animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
