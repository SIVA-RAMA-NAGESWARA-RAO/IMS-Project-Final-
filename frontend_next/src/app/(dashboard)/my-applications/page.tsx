"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileCheck, Loader2, ArrowRight, Clock, MapPin, Building2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    department: string;
    location: string;
  };
  status: string;
  currentRound: number;
  createdAt: string;
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/applications/mine')
      .then(res => {
        if (res.data) {
          const apps = res.data.applications || res.data;
          if (Array.isArray(apps)) setApplications(apps);
        }
      })
      .catch(err => {
        console.error("Failed to load applications", err);
        toast.error("Failed to load your applications");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
          <p className="text-[var(--color-text-muted)]">Track the status of your job applications.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <FileCheck className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-white mb-2">No applications yet</h2>
          <p className="text-[var(--color-text-muted)] mb-6">You haven't applied to any positions yet.</p>
          <Link 
            href="/browse-jobs"
            className="px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium transition-opacity hover:opacity-90 shadow-lg shadow-primary/30"
          >
            Browse Open Jobs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app, idx) => (
            <motion.div
              key={app._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-xs font-medium text-[var(--color-text-muted)] tracking-wider">
                  {app.status}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(app.createdAt).toLocaleDateString()}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                {app.job?.title || "Unknown Job"}
              </h3>
              
              <div className="space-y-2 mb-6 text-sm text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 opacity-70" />
                  <span>{app.job?.department || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 opacity-70" />
                  <span>{app.job?.location || "N/A"}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <div className="text-sm font-medium text-white">
                  Round {app.currentRound}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
