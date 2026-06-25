import React, { useState } from "react";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  Check,
  Facebook,
  Chrome
} from "lucide-react";
import { TeamMember } from "../types";

interface LoginRegisterProps {
  onLoginSuccess: (user: TeamMember, token: string) => void;
}

const AUTH0_DOMAIN = "dev-qqpqoiss4wj2645r.us.auth0.com";
const AUTH0_CLIENT_ID = "eDePEoBhBZA3tZOVx8N70QPWQAA4XSMy";
const REDIRECT_URI = "https://social-core.onrender.com";

function redirectToAuth0(connection: string, pageId?: string) {
  const state = Math.random().toString(36).substring(2);
  const nonce = Math.random().toString(36).substring(2);
  localStorage.setItem("auth0_state", state);
  localStorage.setItem("auth0_nonce", nonce);
  localStorage.setItem("auth0_connection", connection);
  if (pageId) localStorage.setItem("auth0_page_id", pageId);
  else localStorage.removeItem("auth0_page_id");
  const url = `https://${AUTH0_DOMAIN}/authorize?client_id=${AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token id_token&scope=openid profile email&connection=${connection}&state=${state}&nonce=${nonce}`;
  window.location.href = url;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"Admin" | "Manager" | "Contributor" | "Client">("Contributor");

  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCredAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSocialLoading("credentials");

    try {
      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase(), password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccessMsg(`Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(data.user, data.token);
        }, 800);
      } else {
        if (!fullName || !email) {
          setErrorMsg("Please fill out all mandatory register fields.");
          setSocialLoading(null);
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email: email.toLowerCase(),
            password,
            role
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccessMsg(`Account registered! Logging you into SocialCore`);
        setTimeout(() => {
          onLoginSuccess(data.user, data.token);
        }, 1000);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Authentication failed");
      setSocialLoading(null);
    }
  };

  const handleSocialAuth = async (platformName: "Google" | "Facebook" | "Instagram") => {
    setErrorMsg("");
    setSuccessMsg("");
    const connectionMap: Record<string, string> = {
      Google: "google-oauth2",
      Instagram: "instagram",
      Facebook: "facebook"
    };
    let pageId = undefined;
    if (platformName === "Facebook") {
      pageId = prompt("Enter your Facebook Page ID to auto-connect:");
      if (!pageId) return;
    }
    setSocialLoading(platformName);
    redirectToAuth0(connectionMap[platformName], pageId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 antialiased font-sans">
      {socialLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white p-6">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4">
            {successMsg ? (
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center text-2xl font-bold animate-bounce">
                <Check className="w-8 h-8" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>
            )}
            <h4 className="text-sm font-bold tracking-tight">
              {successMsg ? "Success!" : "Connecting..."}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {successMsg || `Connecting to ${socialLoading}...`}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🚀</span>
            <span className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Social</span>Core
            </span>
          </div>
          <p className="text-sm text-slate-600 font-medium max-w-xs mx-auto">
            The modern platform for teams to create, review, and publish social content effortlessly.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {isLogin ? "Welcome back!" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-500">
              {isLogin
                ? "Sign in to access your workspace and campaigns."
                : "Start your journey with SocialCore today."}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => handleSocialAuth("Google")}
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-all"
            >
              <Chrome className="w-4 h-4 text-red-500" />
              <span>Google</span>
            </button>

            <button
              onClick={() => handleSocialAuth("Facebook")}
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 border border-blue-200 bg-blue-50/30 hover:bg-blue-50 rounded-xl text-sm font-semibold text-blue-700 transition-all"
            >
              <Facebook className="w-4 h-4 text-blue-600" />
              <span>Facebook</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center mb-5">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Or continue with email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleCredAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jessica Vance"
                    className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Contributor">Contributor</option>
                  <option value="Client">Client</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={socialLoading === "credentials"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLogin ? "Sign In" : "Create Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setErrorMsg("");
                setIsLogin(!isLogin);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}