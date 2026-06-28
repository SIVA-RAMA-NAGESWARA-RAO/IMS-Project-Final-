"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Briefcase, 
  CalendarDays, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Award,
  ArrowUpRight,
  FileCheck,
  Search
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/api/client";

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "candidate";
  
  if (role === "candidate") {
    return <CandidateDashboard user={user} />;
  }

  return <StaffDashboard user={user} role={role} />;
}

function CandidateDashboard({ user }: { user: any }) {
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { title: "Total Applications", value: "...", icon: FileCheck, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Active Processes", value: "...", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Upcoming Interviews", value: "...", icon: CalendarDays, color: "text-amber-400", bg: "bg-amber-400/10" },
  ]);

  useEffect(() => {
    apiClient.get('/applications/mine')
      .then(res => {
        if (res.data) {
          const apps = res.data.applications || res.data;
          if (Array.isArray(apps)) {
            setApplications(apps);
            const active = apps.filter(a => ['Applied', 'Shortlisted', 'Interview Scheduled'].includes(a.status)).length;
            setStats([
              { title: "Total Applications", value: apps.length.toString(), icon: FileCheck, color: "text-blue-400", bg: "bg-blue-400/10" },
              { title: "Active Processes", value: active.toString(), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { title: "Upcoming Interviews", value: "...", icon: CalendarDays, color: "text-amber-400", bg: "bg-amber-400/10" }, // Mocked or need separate call
            ]);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Candidate'}</h1>
          <p className="text-[var(--color-text-muted)]">Track your job applications and upcoming interviews.</p>
        </div>
        <Link href="/browse-jobs" className="px-5 py-2.5 bg-gradient-primary text-white hover:opacity-90 rounded-xl font-medium transition-opacity flex items-center gap-2 shadow-lg shadow-primary/30">
          <Search className="w-5 h-5" />
          Browse Open Jobs
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-start justify-between mb-4">
                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                  <Icon className={clsx("w-6 h-6", stat.color)} />
                </div>
              </div>
              
              <h3 className="text-[var(--color-text-muted)] text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                {stat.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Applications</h2>
            <Link href="/my-applications" className="text-[var(--color-primary)] text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {applications.slice(0, 3).map((app, i) => (
              <div key={app._id || i} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{app.job?.title || 'Unknown Job'}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Status: {app.status}</p>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <p className="text-[var(--color-text-muted)] text-sm">You haven't applied to any jobs yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StaffDashboard({ user, role }: { user: any, role: string }) {
  const [stats, setStats] = useState([
    { title: "Total Candidates", value: "...", change: "+New", trend: "up", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", link: "/candidates" },
    { title: "Open Positions", value: "...", change: "Active", trend: "up", icon: Briefcase, color: "text-purple-400", bg: "bg-purple-400/10", link: "/jobs" },
    { title: "Interviews This Week", value: "...", change: "Scheduled", trend: "up", icon: CalendarDays, color: "text-emerald-400", bg: "bg-emerald-400/10", link: "/interviews" },
    { title: "Time to Hire", value: "...", change: "Avg", trend: "down", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", link: "/candidates" },
  ]);

  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // Fetch KPIs
    Promise.all([
      apiClient.get('/dashboard/kpi'),
      apiClient.get('/dashboard/time-to-hire'),
      apiClient.get('/audit?limit=4') // Pull 4 recent activities
    ]).then(([kpiRes, timeToHireRes, auditRes]) => {
      if (kpiRes.data) {
        setStats([
          { title: "Total Candidates", value: kpiRes.data.totalCandidates?.toString() || '0', change: "+New", trend: "up", icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", link: "/candidates" },
          { title: "Open Positions", value: kpiRes.data.openPositions?.toString() || '0', change: "Active", trend: "up", icon: Briefcase, color: "text-purple-400", bg: "bg-purple-400/10", link: "/jobs" },
          { title: "Interviews This Week", value: kpiRes.data.thisWeek?.interviews?.toString() || '0', change: "Scheduled", trend: "up", icon: CalendarDays, color: "text-emerald-400", bg: "bg-emerald-400/10", link: "/interviews" },
          { title: "Time to Hire", value: timeToHireRes.data?.averageDays ? `${timeToHireRes.data.averageDays} Days` : "N/A", change: "Avg", trend: "down", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", link: "/candidates" },
        ]);
      }

      if (auditRes.data && Array.isArray(auditRes.data.logs)) {
        setActivities(auditRes.data.logs);
      }
    }).catch(console.error);
  }, []);

  const formatActivity = (log: any) => {
    const userStr = log.user?.name || "System";
    const action = log.action;
    
    switch(action) {
      case 'job_created':
        return {
          action: "New job posting created",
          subject: userStr,
          target: log.metadata?.title || "a new job role",
          type: "job"
        };
      case 'application_submitted':
      case 'candidate_applied':
        return {
          action: "New candidate applied",
          subject: log.metadata?.candidateName || log.metadata?.name || "Candidate",
          target: log.metadata?.jobTitle || "Job",
          type: "apply"
        };
      case 'interview_scheduled':
        return {
          action: "Interview scheduled",
          subject: log.metadata?.candidateName || "Candidate",
          target: log.metadata?.jobTitle || "Job",
          type: "schedule"
        };
      case 'scorecard_submitted':
        return {
          action: "Scorecard submitted",
          subject: userStr,
          target: "Interview evaluation",
          type: "scorecard"
        };
      case 'offer_created':
        return {
          action: "Offer released",
          subject: userStr,
          target: log.metadata?.designation || "Offer Details",
          type: "offer"
        };
      default:
        return {
          action: action.replace(/_/g, ' ').toUpperCase(),
          subject: userStr,
          target: log.entityType || "System Action",
          type: "system"
        };
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-8 pb-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Staff'}</h1>
          <p className="text-[var(--color-text-muted)]">Here's what's happening with your hiring pipeline today.</p>
        </div>
        {(role === 'admin' || role === 'hr') && (
          <Link href="/jobs" className="px-5 py-2.5 bg-white text-black hover:bg-gray-100 rounded-xl font-medium transition-colors flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Create New Job
          </Link>
        )}
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                    <Icon className={clsx("w-6 h-6", stat.color)} />
                  </div>
                  <div className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                    stat.trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </div>
                </div>
                
                <h3 className="text-[var(--color-text-muted)] text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                  {stat.value}
                </p>
              </motion.div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-[var(--color-border)]"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Pipeline Overview</h2>
            <Link href="/jobs" className="text-[var(--color-primary)] text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {["Senior Frontend Engineer", "Product Manager", "UX Designer"].map((job, i) => (
              <div key={job} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{job}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 45 Applied</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> 12 Interviewing</span>
                    <span className="flex items-center gap-1 text-purple-400"><Award className="w-4 h-4" /> 2 Offers</span>
                  </div>
                </div>
                <div className="w-32 h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${80 - i * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6 rounded-2xl border border-[var(--color-border)]"
        >
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--color-border)] before:to-transparent">
            {activities.map((log, i) => {
              const activity = formatActivity(log);
              const timeStr = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
              return (
                <div key={log._id || i} className="relative flex items-start gap-4">
                  <div className={clsx(
                    "w-4 h-4 mt-1.5 rounded-full border-2 border-[var(--color-background)] z-10 shrink-0",
                    activity.type === "apply" ? "bg-blue-400" :
                    activity.type === "schedule" ? "bg-amber-400" :
                    activity.type === "scorecard" ? "bg-purple-400" :
                    activity.type === "offer" ? "bg-emerald-400" : "bg-gray-400"
                  )} />
                  <div>
                    <p className="text-sm font-medium text-white">{activity.action}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      <span className="text-gray-300">{activity.subject}</span> for {activity.target}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] opacity-70 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeStr}
                    </p>
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="text-[var(--color-text-muted)] text-sm">No recent activity found.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
