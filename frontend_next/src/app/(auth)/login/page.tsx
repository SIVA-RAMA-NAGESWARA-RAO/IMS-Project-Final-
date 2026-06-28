"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, Mail, ChevronRight, Loader2, Sparkles,
  Eye, EyeOff, RotateCw, AlertCircle
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession, isAuthenticated, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"internal" | "candidate">("internal");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Internal staff fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Candidate fields
  const [candidateEmail, setCandidateEmail] = useState("");

  // OTP / MFA state
  const [showOtp, setShowOtp] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  // OTP resend countdown
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const goToOtp = (email: string, token: string, cooldownSecs = 60) => {
    setTempToken(token);
    setOtpEmail(email);
    setOtpCode("");
    setOtpError("");
    setOtpCountdown(cooldownSecs);
    setShowOtp(true);
  };

  const resetOtpForm = () => {
    setShowOtp(false);
    setOtpCode("");
    setTempToken("");
    setOtpEmail("");
    setOtpError("");
    setOtpCountdown(0);
  };

  const resetAllForms = (tab: "internal" | "candidate") => {
    resetOtpForm();
    setActiveTab(tab);
    if (tab === "internal") { setCandidateEmail(""); }
    else { setEmail(""); setPassword(""); }
  };

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data.requiresOtp) {
        goToOtp(email, res.data.tempToken, res.data.resendCooldownSeconds || 60);
        toast.success("Check your email for a 6-digit code.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.post("/auth/login", { email: candidateEmail });
      if (res.data.requiresOtp) {
        goToOtp(candidateEmail, res.data.tempToken, res.data.resendCooldownSeconds || 60);
        toast.success("Sign-in code sent to your email.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send sign-in code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) { setOtpError("Enter a valid 6-digit code"); return; }
    setOtpError("");
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.post("/auth/verify-login-otp", { tempToken, code: otpCode });
      // ✅ FIXED: store session properly
      const { user, accessToken } = res.data;
      setSession(user, accessToken);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid or expired code";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const purpose = activeTab === "internal" ? "login" : "login";
      const res = await apiClient.post("/auth/resend-otp", { email: otpEmail, purpose });
      setOtpCountdown(res.data.resendCooldownSeconds || 60);
      setOtpCode("");
      setOtpError("");
      toast.success("New code sent!");
    } catch (err: any) {
      const retryAfter = err.response?.data?.retryAfterSeconds;
      if (retryAfter) setOtpCountdown(retryAfter);
      toast.error(err.response?.data?.message || "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background glows */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent blur-[100px] -z-10 pointer-events-none"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-[var(--color-secondary)]/20 to-transparent blur-[100px] -z-10 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-3xl shadow-2xl shadow-black/50 border border-white/10 relative overflow-hidden backdrop-blur-xl bg-black/40">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-lg shadow-primary/30 mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">IMS Enterprise</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Sign in to your account</p>
          </div>

          {/* Tab Toggle */}
          {!showOtp && (
            <div className="flex p-1 mb-8 bg-white/5 rounded-xl border border-white/10 relative">
              <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-primary rounded-lg z-0"
                initial={false}
                animate={{ x: activeTab === "internal" ? 0 : "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
              <button
                type="button"
                onClick={() => resetAllForms("internal")}
                className={clsx("flex-1 py-2 text-sm font-medium relative z-10 transition-colors",
                  activeTab === "internal" ? "text-white" : "text-[var(--color-text-muted)] hover:text-white"
                )}
              >
                Internal Staff
              </button>
              <button
                type="button"
                onClick={() => resetAllForms("candidate")}
                className={clsx("flex-1 py-2 text-sm font-medium relative z-10 transition-colors",
                  activeTab === "candidate" ? "text-white" : "text-[var(--color-text-muted)] hover:text-white"
                )}
              >
                Candidate
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── OTP Verification Step ── */}
            {showOtp && (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerifyOtp}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">2-Step Verification</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    We sent a 6-digit code to{" "}
                    <strong className="text-white">{otpEmail}</strong>
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, ""));
                      setOtpError("");
                    }}
                    className={clsx(
                      "block w-full text-center tracking-[1em] text-2xl py-4 border rounded-xl leading-5 bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 transition-all",
                      otpError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-white/10 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                    )}
                    placeholder="------"
                  />
                  {otpError && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {otpError}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <><span>Verify &amp; Sign in</span><ChevronRight className="ml-2 w-4 h-4" /></>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={resetOtpForm}
                    className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
                  >
                    ← Back to login
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0 || loading}
                    className={clsx(
                      "flex items-center gap-1.5 text-xs transition-colors",
                      otpCountdown > 0
                        ? "text-[var(--color-text-muted)] cursor-not-allowed"
                        : "text-[var(--color-primary)] hover:text-[var(--color-secondary)]"
                    )}
                  >
                    <RotateCw className={clsx("w-3 h-3", loading && otpCountdown === 0 && "animate-spin")} />
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend code"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Internal Staff Login ── */}
            {!showOtp && activeTab === "internal" && (
              <motion.form
                key="internal-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleInternalLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                      placeholder="admin@ims.example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-medium transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 transition-all disabled:opacity-50 mt-6"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <><span>Sign in secure</span><ChevronRight className="ml-2 w-4 h-4" /></>
                  )}
                </button>
              </motion.form>
            )}

            {/* ── Candidate Login ── */}
            {!showOtp && activeTab === "candidate" && (
              <motion.form
                key="candidate-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleCandidateLogin}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-[var(--color-text-muted)] px-4">
                    Enter the email you registered with and we'll send you a secure 6-digit sign-in code.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">
                    Candidate Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-[var(--color-text-muted)]" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)] focus:border-[var(--color-secondary)] transition-all sm:text-sm"
                      placeholder="candidate@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 transition-all disabled:opacity-50 mt-6"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <><span>Send sign-in code</span><ChevronRight className="ml-2 w-4 h-4" /></>
                  )}
                </button>

                <p className="text-center text-xs text-[var(--color-text-muted)] pt-2">
                  New here?{" "}
                  <Link href="/register" className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-medium">
                    Create an account
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
