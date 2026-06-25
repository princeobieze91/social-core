import React, { useState } from "react";
import { Shield, CheckCircle, ArrowRight, Lock } from "lucide-react";

const AUTH0_DOMAIN = "dev-qqpqoiss4wj2645r.us.auth0.com";
const AUTH0_CLIENT_ID = "eDePEoBhBZA3tZOVx8N70QPWQAA4XSMy";
const REDIRECT_URI = "https://social-core.onrender.com";

const PROVIDER_CONFIG: Record<string, {
  name: string;
  color: string;
  icon: string;
  connection: string;
  scopes: string[];
}> = {
  google: {
    name: "Google",
    color: "from-red-500 to-yellow-500",
    icon: "G",
    connection: "google-oauth2",
    scopes: ["View your name", "View your email address", "View your profile picture"]
  },
  instagram: {
    name: "Instagram",
    color: "from-purple-600 via-pink-500 to-orange-400",
    icon: "\ud83d\udcf8",
    connection: "instagram",
    scopes: ["View your profile", "View your email address", "View your media"]
  }
};

interface OAuthConsentProps {
  provider: string;
  onBack: () => void;
}

export default function OAuthConsent({ provider, onBack }: OAuthConsentProps) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.google;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuthorize = () => {
    setLoading(true);
    setError("");

    const state = Math.random().toString(36).substring(2);
    const nonce = Math.random().toString(36).substring(2);
    localStorage.setItem("auth0_state", state);
    localStorage.setItem("auth0_nonce", nonce);

    const url = `https://${AUTH0_DOMAIN}/authorize?client_id=${AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token id_token&scope=openid profile email&connection=${config.connection}&state=${state}&nonce=${nonce}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className={`bg-gradient-to-r ${config.color} p-6 text-white text-center`}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <span className={`text-2xl font-black ${provider === "instagram" ? "" : "text-white"}`}>{config.icon}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">SocialCore Hub</h1>
          <p className="text-white/80 text-xs mt-1">wants to access your {config.name} account</p>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">{"\ud83d\ude80"}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">SocialCore Hub</p>
              <p className="text-[11px] text-slate-500">social-core.onrender.com</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Powered by Make.com</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              This will allow SocialCore to:
            </p>
            <div className="space-y-2.5">
              {config.scopes.map((scope, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium">{scope}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              SocialCore will not be able to post, message, or take any action on your behalf without additional permission.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              disabled={loading}
              className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className={`flex-1 py-2.5 px-4 bg-gradient-to-r ${config.color} hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authorize</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-4">
            By authorizing, you agree to SocialCore's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
