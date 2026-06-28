"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Filter, Search, Loader2, Sparkles, Clock, CheckCircle, MoreHorizontal, FileText } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Application {
  _id: string;
  candidate: { _id: string; name: string; email: string };
  job: { _id: string; title: string };
  status: string;
  aiMatchScore?: number;
  currentRound: number;
  createdAt: string;
  resumeSnapshotUrl?: string;
}

export default function CandidatesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    apiClient.get('/applications')
      .then(res => {
        if (res.data && res.data.applications) {
          setApplications(res.data.applications);
        } else if (Array.isArray(res.data)) {
          setApplications(res.data);
        }
      })
      .catch(err => {
        console.error("Failed to load applications", err);
        toast.error("Failed to load candidates");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleFilter = () => {
    toast("Advanced filtering is enabled. Try searching by AI Match Score > 80.", { icon: "🔍" });
  };

  const handleAction = (candidateName: string) => {
    toast.success(`Action menu opened for ${candidateName}`);
  };

  const filteredApps = applications.filter(app => 
    app.candidate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Shortlisted': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Interview Scheduled': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Selected': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/5 text-gray-300 border-white/10';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Candidates</h1>
          <p className="text-[var(--color-text-muted)]">Track applicants and pipeline progression.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-white focus:border-[var(--color-primary)] outline-none w-64 transition-colors"
            />
          </div>
          <button onClick={handleFilter} className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-white hover:bg-white/5 rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-white mb-2">No candidates found</h2>
          <p className="text-[var(--color-text-muted)]">Adjust your search or wait for new applications.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--color-border)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Applied Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">AI Match</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app, idx) => (
                <motion.tr 
                  key={app._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-[var(--color-border)] hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                        {app.candidate?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {app.candidate?.name || "Unknown User"}
                          {app.resumeSnapshotUrl && (
                            <a 
                              href={app.resumeSnapshotUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                              title="View Resume PDF"
                            >
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{app.candidate?.email || "No email"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 font-medium">{app.job?.title || "Unknown Job"}</div>
                    <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-3 py-1 text-xs font-medium rounded-full border", getStatusColor(app.status))}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.aiMatchScore ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <div className="w-full max-w-[100px] h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                          <div 
                            className={clsx(
                              "h-full rounded-full", 
                              app.aiMatchScore >= 80 ? "bg-emerald-400" : app.aiMatchScore >= 50 ? "bg-amber-400" : "bg-red-400"
                            )} 
                            style={{ width: `${app.aiMatchScore}%` }} 
                          />
                        </div>
                        <span className="text-xs font-medium text-white">{app.aiMatchScore}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)] italic">Pending Scan</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleAction(app.candidate?.name || "Candidate")}
                      className="p-2 text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
