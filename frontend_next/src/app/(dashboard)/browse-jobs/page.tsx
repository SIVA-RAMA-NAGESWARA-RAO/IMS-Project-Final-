"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Building2, Search, Loader2 } from "lucide-react";
import Link from "next/link";
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

export default function BrowseJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    apiClient.get('/jobs')
      .then(res => {
        if (res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.jobs || []);
          // Filter to only show 'open' jobs
          setJobs(list.filter((j: Job) => j.status === 'open'));
        }
      })
      .catch(err => {
        console.error("Failed to load jobs", err);
        toast.error("Failed to load jobs");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Browse Open Roles</h1>
          <p className="text-[var(--color-text-muted)]">Find your next opportunity and apply directly.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search jobs or departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-white outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <Briefcase className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-white mb-2">No jobs found</h2>
          <p className="text-[var(--color-text-muted)]">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job, idx) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-xs font-medium text-[var(--color-text-muted)] tracking-wider">
                  {job.department}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--color-primary)] transition-colors">
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
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </span>
                <Link 
                  href={`/careers/${job._id}/apply`}
                  className="px-4 py-2 bg-gradient-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Apply Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
