"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Mail, Phone, ChevronRight, Loader2, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP verification step
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(60);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      await apiClient.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
      });
      setShowOtp(true);
      setOtpCountdown(60);
      toast.success("Account created! Check your email for a verification code.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(msg);
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { toast.error("Enter a valid 6-digit code"); return; }
    setLoading(true);
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.post("/auth/verify-otp", { email: form.email, code: otpCode });
      setSession(res.data.user, res.data.accessToken);
      toast.success("Email verified! Welcome to IMS 🎉");
      router.push("/");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (otpCountdown > 0) return;
    try {
      const { default: apiClient } = await import("@/api/client");
      const res = await apiClient.post("/auth/resend-otp", { email: form.email, purpose: "registration" });
      setOtpCountdown(res.data.resendCooldownSeconds || 60);
      setOtpCode("");
      toast.success("New code sent!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not resend code");
    }
  };

  const f = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => { const c = { ...prev }; delete c[field]; return c; });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent blur-[100px] -z-10 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 rounded-3xl shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-xl bg-black/40">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-lg shadow-primary/30 mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {showOtp ? "Verify Your Email" : "Create Account"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {showOtp
                ? `Enter the 6-digit code sent to ${form.email}`
                : "Register as a candidate to apply for jobs"}
            </p>
          </div>

          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="block w-full text-center tracking-[1em] text-2xl py-4 border border-white/10 rounded-xl bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                placeholder="------"
              />
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full flex justify-center items-center py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue →"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={otpCountdown > 0}
                className="w-full text-xs text-[var(--color-text-muted)] hover:text-white transition-colors disabled:cursor-not-allowed"
              >
                {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="text" required value={form.name} onChange={(e) => f("name", e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="Jane Doe" />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="email" required value={form.email} onChange={(e) => f("email", e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="jane@example.com" />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 ml-1">Phone (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="tel" value={form.phone} onChange={(e) => f("phone", e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => f("password", e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                  <input type="password" required value={form.confirm} onChange={(e) => f("confirm", e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] sm:text-sm"
                    placeholder="••••••••" />
                </div>
                {errors.confirm && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirm}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90 disabled:opacity-50 mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><span>Create Account</span><ChevronRight className="ml-2 w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-[var(--color-text-muted)] pt-2">
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--color-primary)] hover:text-[var(--color-secondary)] font-medium">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
