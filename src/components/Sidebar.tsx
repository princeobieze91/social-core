import React from "react";
import { Linkedin, Instagram, Facebook } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <span className="font-bold text-slate-900">SocialCore</span>
        </div>
      </div>

      {/* Workspace */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="text-xs font-medium text-slate-500 mb-2">WORKSPACE</div>
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">A</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">Acme Corp</div>
            <div className="text-xs text-slate-500">12 members</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-medium text-slate-500 mb-2">CHANNELS</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700">
            <Facebook className="w-4 h-4" /> Facebook
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700">
            <Instagram className="w-4 h-4" /> Instagram
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700">
            <Linkedin className="w-4 h-4" /> LinkedIn
          </div>
        </div>
      </nav>

      {/* Info */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          Connect channels via Make.com for Facebook/Instagram, or LinkedIn OAuth.
        </div>
      </div>
    </aside>
  );
}