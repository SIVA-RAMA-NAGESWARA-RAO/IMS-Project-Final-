"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate, Plus, Search, Trash2, FileText, CheckCircle2, X, Clock, Loader2 } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Template {
  _id: string;
  name: string;
  job?: { _id: string; title: string };
  round?: number;
  competencies: string[];
  questions: string[];
  suggestedDurationMinutes: number;
  updatedAt: string;
}

interface Job {
  _id: string;
  title: string;
  department: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");

  // Create Template Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [jobId, setJobId] = useState("");
  const [round, setRound] = useState(1);
  const [duration, setDuration] = useState(45);
  const [newCompetency, setNewCompetency] = useState("");
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchJobs();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/templates");
      setTemplates(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load interview templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await apiClient.get("/jobs");
      const list = res.data.jobs || res.data || [];
      setJobs(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Please enter a template name");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/templates", {
        name,
        jobId: jobId || undefined,
        round: Number(round),
        competencies,
        questions,
        suggestedDurationMinutes: Number(duration)
      });
      toast.success("Interview template created!");
      setIsModalOpen(false);
      // Reset form
      setName("");
      setJobId("");
      setRound(1);
      setDuration(45);
      setCompetencies([]);
      setQuestions([]);
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await apiClient.delete(`/templates/${id}`);
      toast.success("Template deleted successfully!");
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete template");
    }
  };

  const addCompetency = () => {
    if (newCompetency.trim() && !competencies.includes(newCompetency.trim())) {
      setCompetencies([...competencies, newCompetency.trim()]);
      setNewCompetency("");
    }
  };

  const addQuestion = () => {
    if (newQuestion.trim() && !questions.includes(newQuestion.trim())) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (template.job?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = selectedDept === "All Departments" || 
      jobs.find(j => j._id === template.job?._id)?.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <LayoutTemplate className="w-8 h-8 text-[var(--color-primary)]" />
            Interview Templates
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Manage standardized evaluation kits (competencies & questions) across your organization.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-gradient-primary hover:opacity-90 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </header>

      {/* Search and Filters */}
      <div className="glass-panel p-6 rounded-3xl mb-8 border border-[var(--color-border)]">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search templates by name or job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl pl-12 pr-4 py-3 text-white text-sm outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">Filter:</span>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white text-sm outline-none"
            >
              <option>All Departments</option>
              {Array.from(new Set(jobs.map(j => j.department))).filter(Boolean).map(dept => (
                <option key={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/5">
          <LayoutTemplate className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-40" />
          <h2 className="text-lg font-semibold text-white mb-2">No templates found</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Create a standardized interview evaluation template to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-2xl overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all border border-[var(--color-border)] flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                    {template.job?.title || "General Kit"}
                  </span>
                  <button 
                    onClick={() => handleDeleteTemplate(template._id)}
                    className="text-[var(--color-text-muted)] hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                  {template.name}
                </h3>
                
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {template.competencies?.length || 0} Criteria
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    {template.questions?.length || 0} Qs
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {template.suggestedDurationMinutes}m
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Updated {new Date(template.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                  Active Kit
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
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

            <h2 className="text-2xl font-bold text-white mb-6">Create Interview Kit</h2>

            <form onSubmit={handleCreateTemplate} className="space-y-5">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineering Kit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                />
              </div>

              {/* Bind to Job */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Assign to Job Role</label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                >
                  <option value="" className="bg-[var(--color-surface)] text-[var(--color-text-muted)]">General (No Specific Job)</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id} className="bg-[var(--color-surface)] text-white">
                      {job.title} ({job.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Round */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Round Number</label>
                  <input
                    type="number"
                    min={1}
                    value={round}
                    onChange={(e) => setRound(Number(e.target.value))}
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Suggested Duration (mins)</label>
                  <input
                    type="number"
                    min={10}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                </div>
              </div>

              {/* Add Competencies */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Evaluation Criteria / Competencies</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. System Design, Communication"
                    value={newCompetency}
                    onChange={(e) => setNewCompetency(e.target.value)}
                    className="flex-1 p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={addCompetency}
                    className="px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5">
                  {competencies.map((comp) => (
                    <span key={comp} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs border border-[var(--color-primary)]/20">
                      {comp}
                      <button type="button" onClick={() => setCompetencies(competencies.filter(c => c !== comp))}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Add Questions */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Interview Questions bank</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Describe a time you resolved a merge conflict."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="flex-1 p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-1.5 max-h-28 overflow-y-auto p-1.5">
                  {questions.map((q, qidx) => (
                    <li key={qidx} className="flex justify-between items-center gap-4 text-xs text-gray-300 p-2 rounded-lg bg-white/5">
                      <span>{qidx + 1}. {q}</span>
                      <button type="button" onClick={() => setQuestions(questions.filter((_, idx) => idx !== qidx))} className="text-[var(--color-text-muted)] hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
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
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Template
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
