"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Loader2, ArrowLeft, Send, CheckCircle2, User, Mail, Phone, Link as LinkIcon, FileText } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  workType: string;
  description: string;
}

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    portfolio: "",
    resumeText: ""
  });

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const res = await apiClient.get('/jobs');
      const allJobs = res.data.jobs || res.data || [];
      const foundJob = allJobs.find((j: Job) => j._id === jobId);
      if (foundJob) setJob(foundJob);
      else toast.error("Job not found");
    } catch (error) {
      console.error(error);
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Please upload a PDF file only");
      return;
    }

    setUploadingFile(true);
    const uploadData = new FormData();
    uploadData.append("resume", file);

    try {
      const res = await apiClient.post("/applications/upload-resume", uploadData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Accept either res.data.url or res.data
      const url = res.data?.url || res.data;
      if (typeof url === 'string') {
        setResumeUrl(url);
        toast.success("Resume PDF uploaded successfully!");
      } else {
        throw new Error("Invalid response format from upload server");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to upload resume PDF");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.resumeText) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!resumeUrl) {
      toast.error("Please upload your resume PDF first");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobId,
        candidate: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          linkedin: formData.linkedin,
          portfolio: formData.portfolio
        },
        resumeText: formData.resumeText,
        resumeSnapshotUrl: resumeUrl
      };

      await apiClient.post('/applications/apply', payload);
      setSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to submit application";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-background)]">
        <h2 className="text-2xl font-bold text-white mb-4">Job Not Found</h2>
        <Link href="/careers" className="text-[var(--color-primary)] hover:underline">
          Return to Careers
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[var(--color-background)]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel max-w-lg w-full p-10 rounded-3xl text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Application Submitted!</h2>
          <p className="text-[var(--color-text-muted)] mb-8">
            Thank you for applying for the <strong>{job.title}</strong> position. Our AI Agent is currently reviewing your profile, and we will be in touch shortly via email!
          </p>
          <Link 
            href="/careers"
            className="px-6 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-white font-medium rounded-xl transition-colors"
          >
            Explore More Jobs
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-background)] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/careers" 
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Careers
        </Link>

        {/* Job Header */}
        <div className="glass-panel p-8 rounded-3xl mb-8 border border-[var(--color-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-4">
            {job.department}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {job.workType || "Full-time"}
            </div>
          </div>
        </div>

        {/* Application Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-3xl border border-[var(--color-border)]"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Submit Your Application</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input 
                    type="text" required
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input 
                    type="email" required
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input 
                    type="tel"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1">LinkedIn Profile</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                  <input 
                    type="url"
                    value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm"
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
            </div>

            {/* Resume PDF File Upload */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Upload Resume PDF *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploadingFile}
                className="block w-full text-sm text-[var(--color-text-muted)]
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--color-primary)]/10 file:text-[var(--color-primary)]
                  hover:file:bg-[var(--color-primary)]/20
                  cursor-pointer bg-white/5 border border-white/10 rounded-xl p-3"
              />
              {uploadingFile && (
                <p className="text-xs text-[var(--color-primary)] mt-2 animate-pulse">
                  Uploading PDF to server...
                </p>
              )}
              {resumeUrl && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  ✓ Resume uploaded successfully!
                </p>
              )}
            </div>

            {/* Resume Content */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 ml-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resume / Profile Summary *
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-3 ml-1">
                Our AI parser will automatically extract your skills, experience, and education from this text.
              </p>
              <textarea 
                required rows={8}
                value={formData.resumeText} onChange={e => setFormData({...formData, resumeText: e.target.value})}
                className="block w-full p-4 border border-white/10 rounded-xl bg-white/5 text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all sm:text-sm resize-none"
                placeholder="Paste your plain-text resume, cover letter, or a detailed summary of your professional experience here..."
              />
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Submit Application
                    <Send className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              By submitting this application, you agree to our privacy policy and terms of service.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
