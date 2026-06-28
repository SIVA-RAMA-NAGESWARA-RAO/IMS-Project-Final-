"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, Video, Loader2, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Interview {
  _id: string;
  round: number;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  meetingStartUrl?: string;
  meetingSource?: string;
  status: string;
  mode?: string;
  application: {
    _id: string;
    job: { title: string };
  };
}

export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/interviews')
      .then(res => {
        if (res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.interviews || []);
          setInterviews(list);
        }
      })
      .catch(err => {
        console.error("Failed to load interviews", err);
        toast.error("Failed to load your interviews");
      })
      .finally(() => setLoading(false));
  }, []);

  const upcoming = interviews.filter(i => i.status === "scheduled" && new Date(i.scheduledAt) > new Date());
  const past = interviews.filter(i => i.status !== "scheduled" || new Date(i.scheduledAt) <= new Date());

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Interviews</h1>
          <p className="text-[var(--color-text-muted)]">View and join your upcoming interviews.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <CalendarDays className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-white mb-2">No interviews scheduled</h2>
          <p className="text-[var(--color-text-muted)]">When an interview is scheduled, it will appear here.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcoming.map((inv, idx) => (
                  <InterviewCard key={inv._id} interview={inv} delay={idx * 0.05} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Past & Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
                {past.map((inv, idx) => (
                  <InterviewCard key={inv._id} interview={inv} delay={idx * 0.05} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InterviewCard({ interview, delay }: { interview: Interview; delay: number }) {
  const date = new Date(interview.scheduledAt);
  const isPast = date < new Date() && interview.status === "scheduled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-xs font-medium text-[var(--color-text-muted)] tracking-wider uppercase">
          Round {interview.round}
        </div>
        <div className={clsx(
          "px-2.5 py-1 rounded-full text-xs font-semibold",
          interview.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
          interview.status === "cancelled" ? "bg-red-500/10 text-red-400" :
          "bg-amber-500/10 text-amber-400"
        )}>
          {isPast ? "Past" : interview.status}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--color-primary)] transition-colors">
        {interview.application?.job?.title || "Unknown Role"}
      </h3>

      <div className="space-y-3 mb-6 text-sm text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 opacity-70" />
          <span>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-70" />
          <span>{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({interview.durationMinutes} mins)</span>
        </div>
      </div>

      {interview.meetingLink && !isPast && interview.status === "scheduled" && (
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <a
            href={interview.meetingLink.startsWith('http') ? interview.meetingLink : `https://${interview.meetingLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 rounded-xl font-medium transition-colors"
          >
            <Video className="w-4 h-4" />
            Join Meeting <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </motion.div>
  );
}
