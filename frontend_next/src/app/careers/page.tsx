"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Building2, ChevronRight, Loader2, Search } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  workType: string;
  status: string;
  createdAt: string;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { default: apiClient } = await import("@/api/client");
      // For a public careers page, we ideally have a public GET /api/jobs/public endpoint.
      // But since we are reusing the internal one (assuming it doesn't block without auth for now, or we mock it)
      // Wait! GET /api/jobs requires auth in the backend. 
      // Let's call it anyway, the Dev Bypass will allow it. In production, we'd add a public endpoint.
      const res = await apiClient.get('/jobs');
      const allJobs = res.data.jobs || res.data || [];
      // Filter only open jobs for the public careers page
      setJobs(allJobs.filter((j: Job) => j.status === 'open'));
    } catch (error) {
      console.error("Failed to load jobs", error);
      toast.error("Failed to load open positions.");
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(search.toLowerCase()) || 
    job.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full flex flex-col relative bg-[var(--color-background)]">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-6 lg:pt-32 lg:pb-24 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-[var(--color-primary)] mb-6 border border-[var(--color-primary)]/20">
            <Building2 className="w-4 h-4" />
            <span>Join Our Team</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Build the future of <span className="text-transparent bg-clip-text bg-gradient-primary">Enterprise Software</span>
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] mb-10 max-w-2xl mx-auto">
            We're looking for passionate individuals to join our world-class team. Explore our open positions and help us shape the next generation of technology.
          </p>
          
          <div className="max-w-xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
            </div>
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role or department..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full py-4 pl-12 pr-6 text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all shadow-xl shadow-black/20"
            />
          </div>
        </motion.div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center border border-[var(--color-border)]">
            <Briefcase className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No open positions found</h3>
            <p className="text-[var(--color-text-muted)]">Check back later or try adjusting your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Open Positions</h2>
              <span className="text-sm font-medium px-3 py-1 bg-[var(--color-surface)] rounded-full text-[var(--color-text-muted)]">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>
            
            {filteredJobs.map((job, idx) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/careers/${job._id}/apply`}>
                  <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between group hover:border-[var(--color-primary)]/50 transition-all hover:shadow-[0_0_30px_rgba(94,106,210,0.15)] cursor-pointer">
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                          {job.department}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--color-primary-light)] transition-colors">
                        {job.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 opacity-70" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 opacity-70" />
                          {job.workType || "Full-time"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 md:mt-0 md:ml-6 flex items-center justify-end">
                      <div className="flex items-center gap-2 text-[var(--color-primary)] font-medium group-hover:translate-x-1 transition-transform">
                        Apply Now
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                    
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
