import React, { useState } from "react";
import { 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  Info,
  Shield,
  Facebook,
  Instagram
} from "lucide-react";
import { TeamMember } from "../types";

interface LoginRegisterProps {
  onLoginSuccess: (user: TeamMember, token: string) => void;
  onSocialLogin: (provider: string) => void;
}

export default function LoginRegister({ onLoginSuccess, onSocialLogin }: LoginRegisterProps) {
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
    onSocialLogin(platformName.toLowerCase());
  };

  const getActiveSocialLoadingMessage = () => {
    if (socialLoading === "Google") return "Establishing handshake with Google Accounts API...";
    if (socialLoading === "Facebook") return "Validating Facebook Security Profiles Token...";
    if (socialLoading === "Instagram") return "Requesting Instagram Creator Permissions...";
    if (socialLoading === "credentials") return isLogin ? "Verifying workspace authorization..." : "Securing registration database...";
    return "Authenticating...";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-indigo-100 antialiased font-sans">
      
      {socialLoading && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center z-50 text-white p-6">
          <div className="bg-slate-800 border border-slate-700/60 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4">
            {successMsg ? (
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center text-2xl font-bold animate-bounce mb-2">
                <Check className="w-8 h-8" />
              </div>
            ) : (
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>
            )}
            
            <h4 className="text-sm font-bold tracking-tight">
              {successMsg ? "Authorization Granted" : "Securing Session Channel"}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {successMsg || getActiveSocialLoadingMessage()}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        
        <div className="w-full md:w-[45%] bg-indigo-950 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

          <div>
            <div className="flex items-center gap-2 mb-8">
              <span className="text-3xl p-1 bg-white/10 rounded-xl border border-white/15">🚀</span>
              <span className="font-display font-black text-lg tracking-tight uppercase"><span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Social</span>Core</span>
            </div>

            <div className="space-y-4 max-w-xs mt-12">
              <h2 className="text-2xl font-display font-medium tracking-tight leading-snug">
                One platform, integrated multi-channel campaigns.
              </h2>
              <p className="text-indigo-200 text-xs leading-relaxed font-sans font-medium">
                Plan, review, approve, and automate your client social calendar with state-of-the-art visual grids and collaborative AI reviewers.
              </p>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex gap-2.5 items-start bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-indigo-100">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Certified Security:</strong> Direct API integrations with SQLite-powered user management and JWT-secured sessions.
              </span>
            </div>
            <p className="text-[10px] text-indigo-300 font-mono">
              PRODUCTION BUILD SUITE • VERSION 3.2.2026
            </p>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
          
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-xl font-bold font-display text-slate-800">
              {isLogin ? "Log in to your workspace" : "Register corporate profile"}
            </h1>
            <p className="text-xs text-slate-400 font-medium font-sans">
              {isLogin 
                ? "Access campaign matrices, team review pipelines, and AI assistance." 
                : "Establish an authorization account role to plan cooperative schedules."
              }
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs font-semibold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 mb-6">
            <button
              onClick={() => handleSocialAuth("Google")}
              type="button"
              className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer shadow-xs"
            >
              <span className="text-base font-bold text-red-500">G</span>
              <span>Google</span>
            </button>

            <button
              onClick={() => handleSocialAuth("Facebook")}
              type="button"
              className="flex items-center justify-center gap-1.5 py-2.5 border border-blue-200 bg-blue-50/20 hover:bg-blue-50 rounded-xl text-xs font-bold text-blue-700 transition-all cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5 fill-blue-600 stroke-none" />
              <span>Facebook</span>
            </button>

            <button
              onClick={() => handleSocialAuth("Instagram")}
              type="button"
              className="flex items-center justify-center gap-1.5 py-2.5 border border-purple-200 bg-purple-50/20 hover:bg-purple-50 rounded-xl text-xs font-bold text-purple-700 transition-all cursor-pointer"
            >
              <Instagram className="w-3.5 h-3.5 text-purple-600 stroke-width-[2.5]" />
              <span>Instagram</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">Or use credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleCredAuth} className="space-y-4">
            
            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jessica Vance"
                    className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-800"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  >
                    <option value="Admin">Admin (All Access)</option>
                    <option value="Manager">Manager (Reviewer)</option>
                    <option value="Contributor">Contributor (Producer)</option>
                    <option value="Client">Client (Approver)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <span>{isLogin ? "Authenticate Credentials" : "Create Authorized Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setErrorMsg("");
                setIsLogin(!isLogin);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
            >
              {isLogin 
                ? "Need a corporate workspace account? Register profile" 
                : "Already registered with SocialCore? Sign in here"
              }
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
