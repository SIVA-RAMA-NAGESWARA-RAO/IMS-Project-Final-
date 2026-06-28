"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Plus, MapPin, Map, Loader2, Calendar, X } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  workType: string;
  status: string;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "",
    workType: "Full-time",
    description: "",
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await apiClient.get('/jobs');
      if (res.data && res.data.jobs) {
        setJobs(res.data.jobs);
      } else if (Array.isArray(res.data)) {
        setJobs(res.data);
      }
    } catch (error) {
      console.error("Failed to load jobs", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.department || !newJob.location) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      const res = await apiClient.post('/jobs', { ...newJob, status: 'open' });
      toast.success("Job Requisition created successfully!");
      setJobs([res.data.job || res.data, ...jobs]);
      setShowModal(false);
      setNewJob({ title: "", department: "", location: "", workType: "Full-time", description: "" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create job");
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetails = (jobTitle: string) => {
    toast(`Opening details for ${jobTitle}...`);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Requisitions</h1>
          <p className="text-[var(--color-text-muted)]">Manage your active and closed job postings.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-gradient-primary text-white hover:opacity-90 rounded-xl font-medium transition-opacity flex items-center gap-2 shadow-lg shadow-primary/30"
        >
          <Plus className="w-5 h-5" />
          Create New Job
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <Briefcase className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-white mb-2">No jobs found</h2>
          <p className="text-[var(--color-text-muted)]">Create your first job requisition to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job, idx) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  {job.department}
                </div>
                <div className={clsx(
                  "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                  job.status === "open" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  {job.status === "open" ? "Active" : "Closed"}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                {job.title}
              </h3>
              
              <div className="space-y-2 mb-6 text-sm text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 opacity-70" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 opacity-70" />
                  <span>{job.workType || "Full-time"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-70" />
                  <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Pipeline</span>
                </div>
                <button 
                  onClick={() => handleViewDetails(job.title)}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  View Details &rarr;
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel w-full max-w-lg rounded-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white">Create New Job</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--color-text-muted)] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateJob} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Job Title *</label>
                  <input type="text" required value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white outline-none focus:border-[var(--color-primary)]" placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Department *</label>
                    <input type="text" required value={newJob.department} onChange={e => setNewJob({...newJob, department: e.target.value})} className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white outline-none focus:border-[var(--color-primary)]" placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Location *</label>
                    <input type="text" required value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white outline-none focus:border-[var(--color-primary)]" placeholder="e.g. Remote" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Work Type</label>
                  <select value={newJob.workType} onChange={e => setNewJob({...newJob, workType: e.target.value})} className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white outline-none focus:border-[var(--color-primary)]">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Description</label>
                  <textarea rows={3} value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white outline-none focus:border-[var(--color-primary)] resize-none" placeholder="Brief job description..." />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)]">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-[var(--color-text-muted)] hover:text-white font-medium">Cancel</button>
                  <button type="submit" disabled={creating} className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Job
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
