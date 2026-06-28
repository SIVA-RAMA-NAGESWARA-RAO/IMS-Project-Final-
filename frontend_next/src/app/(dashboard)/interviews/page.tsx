"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, Clock, Video, Users, Loader2,
  ArrowUpRight, Plus, RefreshCw, Filter, ExternalLink, X, FileText
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/api/client";

interface Interviewer { _id?: string; name: string; email: string; }
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
    candidate: { name: string; email: string };
    job: { title: string };
    resumeSnapshotUrl?: string;
  };
  interviewers: Interviewer[];
}

const STATUS_STYLES: Record<string, string> = {
  scheduled:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled:   "bg-red-500/10 text-red-400 border-red-500/20",
  rescheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const SOURCE_LABEL: Record<string, string> = {
  jitsi: "Jitsi", zoom: "Zoom", google_meet: "Google Meet", manual: "Custom",
};

function SkeletonCard() {
  return (
    <div className="glass-panel p-6 rounded-2xl animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 w-20 rounded-lg bg-white/5" />
        <div className="h-5 w-24 rounded-full bg-white/5" />
      </div>
      <div className="h-7 w-3/4 rounded bg-white/5 mb-2" />
      <div className="h-4 w-1/2 rounded bg-white/5 mb-6" />
      <div className="space-y-3 p-4 rounded-xl bg-white/5">
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-4/5 rounded bg-white/5" />
        <div className="h-4 w-3/5 rounded bg-white/5" />
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

  // Scheduling Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviewersList, setInterviewersList] = useState<any[]>([]);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Form State
  const [selectedApp, setSelectedApp] = useState("");
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState("video");
  const [meetingLink, setMeetingLink] = useState("");

  const fetchInterviews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get("/interviews");
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.interviews || []);
      setInterviews(list);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to load interviews";
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const openScheduleModal = async () => {
    setIsModalOpen(true);
    try {
      const [appRes, intRes] = await Promise.all([
        apiClient.get("/applications"),
        apiClient.get("/interviewers"),
      ]);
      setApplications(appRes.data.applications || appRes.data || []);
      setInterviewersList(intRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidates or interviewers");
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !scheduledAt) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmittingSchedule(true);
    try {
      await apiClient.post("/interviews", {
        applicationId: selectedApp,
        round,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(duration),
        mode,
        meetingLink: meetingLink || undefined,
        interviewers: selectedInterviewers,
      });
      toast.success("Interview scheduled successfully!");
      setIsModalOpen(false);
      // Reset form
      setSelectedApp("");
      setSelectedInterviewers([]);
      setRound(1);
      setScheduledAt("");
      setMeetingLink("");
      fetchInterviews();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to schedule interview");
    } finally {
      setSubmittingSchedule(false);
    }
  };

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  const filtered = filter === "all" ? interviews : interviews.filter((iv) => iv.status === filter);

  const counts = {
    all: interviews.length,
    scheduled: interviews.filter((iv) => iv.status === "scheduled").length,
    completed: interviews.filter((iv) => iv.status === "completed").length,
    cancelled: interviews.filter((iv) => iv.status === "cancelled").length,
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Interviews</h1>
          <p className="text-[var(--color-text-muted)]">
            Manage upcoming interviews and evaluator assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInterviews(true)}
            disabled={refreshing}
            className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-white hover:bg-white/5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          {(user?.role === "hr" || user?.role === "admin") && (
            <button 
              onClick={openScheduleModal}
              className="px-4 py-2.5 bg-gradient-primary text-white rounded-xl font-medium transition-opacity hover:opacity-90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule
            </button>
          )}
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        {(["all", "scheduled", "completed", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              filter === f
                ? "bg-gradient-primary text-white shadow"
                : "text-[var(--color-text-muted)] hover:text-white"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={clsx("ml-1.5 text-xs", filter === f ? "opacity-80" : "opacity-50")}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <CalendarDays className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-40" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {filter === "all" ? "No interviews yet" : `No ${filter} interviews`}
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm">
            {filter === "all"
              ? "When candidates are scheduled, they'll appear here."
              : `There are no ${filter} interviews to show.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((interview, idx) => {
            const date = new Date(interview.scheduledAt);
            const isPast = date < new Date();
            const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateStr = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

            return (
              <motion.div
                key={interview._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all duration-200"
              >
                {/* Round + Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold uppercase tracking-wider">
                    Round {interview.round}
                  </div>
                  <div className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-semibold border",
                    STATUS_STYLES[interview.status] || STATUS_STYLES.scheduled
                  )}>
                    {(interview.status || "scheduled").toUpperCase()}
                  </div>
                </div>

                {/* Candidate & Job */}
                <h3 className="text-lg font-bold text-white mb-0.5 truncate flex items-center gap-2">
                  {interview.application?.candidate?.name || "Unknown Candidate"}
                  {interview.application?.resumeSnapshotUrl && (
                    <a
                      href={interview.application.resumeSnapshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                      title="View Resume PDF"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                  )}
                </h3>
                <p className="text-sm font-medium text-purple-400 mb-5 truncate">
                  {interview.application?.job?.title || "Unknown Role"}
                </p>

                {/* Details block */}
                <div className="space-y-2.5 mb-5 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-medium">{dateStr}</span>
                    {isPast && interview.status === "scheduled" && (
                      <span className="ml-auto text-xs text-amber-400 font-medium">Past</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{timeStr} · {interview.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="w-4 h-4 text-blue-400 shrink-0" />
                    {interview.meetingLink ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={interview.meetingLink.startsWith('http') ? interview.meetingLink : `https://${interview.meetingLink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 text-sm font-medium"
                        >
                          Join {SOURCE_LABEL[interview.meetingSource || ""] || "Meeting"}
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                        {interview.meetingStartUrl && interview.meetingStartUrl !== interview.meetingLink && (
                          <a
                            href={interview.meetingStartUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                          >
                            (Host) <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--color-text-muted)] italic text-sm">Link TBD</span>
                    )}
                  </div>
                </div>

                {/* Join button for upcoming */}
                {interview.meetingLink && interview.status === "scheduled" && !isPast && (
                  <a
                    href={interview.meetingLink.startsWith('http') ? interview.meetingLink : `https://${interview.meetingLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity mb-4"
                  >
                    <Video className="w-4 h-4" />
                    Join Interview
                  </a>
                )}

                {/* Interviewers */}
                <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
                  <div className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Interviewers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {interview.interviewers?.length > 0 ? (
                      interview.interviewers.map((inv) => (
                        <div
                          key={inv.email}
                          title={inv.email}
                          className="px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-white"
                        >
                          {inv.name}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)] italic">None assigned</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel max-w-lg w-full p-8 rounded-3xl relative flex flex-col border border-[var(--color-border)] bg-[var(--color-surface)] max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Schedule Interview</h2>

            <form onSubmit={handleScheduleSubmit} className="space-y-5">
              {/* Candidate Application selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Candidate Application *</label>
                <select
                  required
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                >
                  <option value="" className="bg-[var(--color-surface)]">Select an Application</option>
                  {applications.map((app) => (
                    <option key={app._id} value={app._id} className="bg-[var(--color-surface)] text-white">
                      {app.candidate?.name} — {app.job?.title} ({app.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Interviewers Checkbox list */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Interviewers</label>
                <div className="max-h-36 overflow-y-auto p-3 border border-white/10 rounded-xl bg-white/5 space-y-2.5">
                  {interviewersList.map((int) => (
                    <label key={int._id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedInterviewers.includes(int._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInterviewers([...selectedInterviewers, int._id]);
                          } else {
                            setSelectedInterviewers(selectedInterviewers.filter(id => id !== int._id));
                          }
                        }}
                        className="rounded border-white/10 text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-white/5 w-4 h-4"
                      />
                      <span>{int.name} ({int.email})</span>
                    </label>
                  ))}
                  {interviewersList.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] italic">No interviewers found</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Round */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Round *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={round}
                    onChange={(e) => setRound(Number(e.target.value))}
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Duration (mins) *</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  >
                    <option value={30} className="bg-[var(--color-surface)]">30 Minutes</option>
                    <option value={45} className="bg-[var(--color-surface)]">45 Minutes</option>
                    <option value={60} className="bg-[var(--color-surface)]">60 Minutes</option>
                    <option value={90} className="bg-[var(--color-surface)]">90 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Scheduled At */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Mode */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Mode *</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  >
                    <option value="video" className="bg-[var(--color-surface)]">Video Call</option>
                    <option value="phone" className="bg-[var(--color-surface)]">Phone Call</option>
                    <option value="onsite" className="bg-[var(--color-surface)]">On-Site</option>
                  </select>
                </div>

                {/* Custom Meeting Link */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Custom Link</label>
                  <input
                    type="text"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="e.g. zoom.us/j/..."
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule Interview
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
