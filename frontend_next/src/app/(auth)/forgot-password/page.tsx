"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ChevronRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = (secs: number) => {
    setCountdown(secs);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      const { default: api } = await import("@/api/client");
      await api.post("/auth/forgot-password", { email });
      toast.success("If that account exists, a code was sent.");
      setStep("otp");
      startCountdown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { default: api } = await import("@/api/client");
      const res = await api.post("/auth/resend-otp", { email, purpose: "password_reset" });
      startCountdown(res.data.resendCooldownSeconds || 60);
      setOtp("");
      toast.success("New code sent!");
    } catch (err: any) {
      const wait = err.response?.data?.retryAfterSeconds;
      if (wait) startCountdown(wait);
      toast.error(err.response?.data?.message || "Could not resend");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setStep("reset");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { default: api } = await import("@/api/client");
      await api.post("/auth/reset-password", { email, code: otp, newPassword });
      setStep("done");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Reset failed. Try requesting a new code.");
      if (err.response?.status === 400) setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-[var(--color-primary)]/15 to-transparent blur-[100px] -z-10 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-3xl shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-xl bg-black/40">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-lg shadow-primary/30 mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {step === "email" && "Enter your email to receive a reset code"}
              {step === "otp" && `We sent a code to ${email}`}
              {step === "reset" && "Enter your new password"}
              {step === "done" && "Your password has been reset"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === "email" && (
              <motion.form key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onSubmit={handleSendOtp} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="your@email.com" autoFocus />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex justify-center items-center py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Reset Code</span><ChevronRight className="ml-2 w-4 h-4" /></>}
                </button>
                <p className="text-center text-xs text-[var(--color-text-muted)]">
                  <Link href="/login" className="text-[var(--color-primary)] hover:text-[var(--color-secondary)]">← Back to login</Link>
                </p>
              </motion.form>
            )}

            {/* Step 2: OTP */}
            {step === "otp" && (
              <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp} className="space-y-5">
                <input type="text" inputMode="numeric" maxLength={6} autoFocus
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="block w-full text-center tracking-[1em] text-2xl py-4 border border-white/10 rounded-xl bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  placeholder="------" />
                <button type="submit" disabled={otp.length !== 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-50">
                  Verify Code →
                </button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setStep("email")} className="text-[var(--color-text-muted)] hover:text-white">← Change email</button>
                  <button type="button" onClick={handleResend} disabled={countdown > 0 || loading}
                    className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed">
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3: New password */}
            {step === "reset" && (
              <motion.form key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type={showPw ? "text" : "password"} required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} minLength={8}
                    className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="New password (min 8 chars)" autoFocus />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white">
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="Confirm new password" />
                </div>
                {confirm && newPassword !== confirm && (
                  <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Passwords do not match</p>
                )}
                <button type="submit" disabled={loading || newPassword !== confirm || newPassword.length < 8}
                  className="w-full flex justify-center items-center py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password →"}
                </button>
              </motion.form>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-[var(--color-text-muted)] text-sm">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <button onClick={() => router.push("/login")}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90">
                  Go to Login →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
