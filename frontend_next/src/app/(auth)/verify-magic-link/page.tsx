"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

import { Suspense } from "react";

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No magic link token found. Please request a new link.");
      return;
    }

    (async () => {
      try {
        const { default: apiClient } = await import("@/api/client");
        // Exchange the magic link token for a full session
        const res = await apiClient.post("/auth/verify-magic-link", { token });
        const { user, accessToken } = res.data;
        setSession(user, accessToken);
        setStatus("success");
        toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
        setTimeout(() => router.push("/"), 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(
          err.response?.data?.message ||
          "This link has expired or already been used. Please request a new one."
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-10 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl bg-black/40 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-lg shadow-primary/30 mb-6">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          {status === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-white">Verifying your link...</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Please wait a moment.</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Signed in successfully!</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Redirecting you to the dashboard...</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Link Invalid</h2>
              <p className="text-sm text-[var(--color-text-muted)]">{errorMsg}</p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-primary hover:opacity-90"
              >
                Return to Login
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
      </div>
    }>
      <VerifyMagicLinkContent />
    </Suspense>
  );
}
