"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle2, ChevronRight, FileText, Send, User, AlertCircle } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import apiClient from "@/api/client";

interface Interview {
  _id: string;
  round: number;
  scheduledAt: string;
  status: string;
  application: {
    _id: string;
    candidate: { name: string; email: string };
    job: { title: string };
  };
}

const competencies = [
  { id: "tech", name: "Technical Proficiency", description: "Knowledge of required programming languages and frameworks." },
  { id: "prob", name: "Problem Solving", description: "Ability to break down complex problems and design elegant solutions." },
  { id: "comms", name: "Communication", description: "Clarity in explaining technical concepts to non-technical stakeholders." },
  { id: "cult", name: "Culture Add", description: "Alignment with core values and team dynamics." },
];

export default function ScorecardsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [loadingInterviews, setLoadingInterviews] = useState(true);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [overallRecommendation, setOverallRecommendation] = useState<string>("select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoadingInterviews(true);
      const res = await apiClient.get("/interviews");
      const list = Array.isArray(res.data) ? res.data : (res.data.interviews || []);
      // Filter scheduled interviews only
      setInterviews(list.filter((iv: Interview) => iv.status === "scheduled"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned interviews");
    } finally {
      setLoadingInterviews(false);
    }
  };

  const selectedInterview = interviews.find(iv => iv._id === selectedInterviewId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterviewId) {
      toast.error("Please select a candidate interview first");
      return;
    }

    setIsSubmitting(true);
    try {
      const compPayload = competencies.map(c => ({
        name: c.name,
        rating: ratings[c.id] || 3,
        notes: notes[c.id] || ""
      }));

      // Calculate average rating
      const ratingsArr = Object.values(ratings);
      const overallRating = ratingsArr.length > 0 
        ? Math.round(ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length) 
        : 3;

      const payload = {
        interviewId: selectedInterviewId,
        competencies: compPayload,
        overallRating,
        recommendation: overallRecommendation,
        strengths: notes["tech"] || "",
        concerns: notes["prob"] || "",
        cultureFitRating: ratings["cult"] || 3,
        communicationRating: ratings["comms"] || 3,
        technicalNotes: notes["tech"] || "",
        additionalComments: "Submitted via IMS Evaluator Dashboard"
      };

      await apiClient.post("/scorecards", payload);
      setIsSuccess(true);
      toast.success("Scorecard submitted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit scorecard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSelectedInterviewId("");
    setRatings({});
    setNotes({});
    setOverallRecommendation("select");
    fetchInterviews();
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-10 rounded-3xl flex flex-col items-center text-center border-emerald-500/30"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Scorecard Submitted!</h2>
          <p className="text-[var(--color-text-muted)] mb-8">
            Your evaluation has been recorded blindly. You'll be able to see other interviewers' feedback once everyone has submitted.
          </p>
          <button 
            onClick={handleReset}
            className="px-6 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-white font-medium rounded-xl transition-colors"
          >
            Evaluate Another Candidate
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-2">
            <span className="hover:text-white cursor-pointer transition-colors">Interviews</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--color-primary)] font-medium">Evaluate Candidate</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-[var(--color-primary)]" />
            Interview Scorecard
          </h1>
        </div>

        {/* Selected Candidate Info Card */}
        {selectedInterview && (
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl glass-panel border border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{selectedInterview.application?.candidate?.name}</p>
              <p className="text-xs text-[var(--color-primary)]">
                {selectedInterview.application?.job?.title} (Round {selectedInterview.round})
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Select active interview */}
      <div className="glass-panel p-6 rounded-3xl mb-8 border border-[var(--color-border)]">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
          Select Interview to Evaluate *
        </label>
        {loadingInterviews ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading assigned interviews...</p>
        ) : (
          <select
            value={selectedInterviewId}
            onChange={(e) => setSelectedInterviewId(e.target.value)}
            className="block w-full p-3 border border-white/10 rounded-xl bg-white/5 text-white outline-none focus:border-[var(--color-primary)] transition-all sm:text-sm"
          >
            <option value="" className="bg-[var(--color-surface)] text-[var(--color-text-muted)]">Choose scheduled candidate interview</option>
            {interviews.map((iv) => (
              <option key={iv._id} value={iv._id} className="bg-[var(--color-surface)] text-white">
                {iv.application?.candidate?.name} — {iv.application?.job?.title} (Round {iv.round})
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedInterviewId ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/5 flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-40" />
          <h2 className="text-lg font-semibold text-white mb-2">No Interview Selected</h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md">
            Please choose a scheduled candidate interview from the selector above to start filling out the scorecard.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-3xl border border-[var(--color-border)]"
          >
            <h2 className="text-xl font-bold text-white mb-6 border-b border-[var(--color-border)] pb-4">
              Competency Ratings
            </h2>
            
            <div className="space-y-10">
              {competencies.map((comp) => (
                <div key={comp.id} className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <h3 className="font-semibold text-white text-lg">{comp.name}</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
                      {comp.description}
                    </p>
                  </div>
                  
                  <div className="md:w-2/3 space-y-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatings({ ...ratings, [comp.id]: star })}
                          className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            ratings[comp.id] >= star 
                              ? "bg-gradient-primary text-white shadow-lg shadow-primary/20 scale-105" 
                              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50"
                          )}
                        >
                          <Star className={clsx("w-6 h-6", ratings[comp.id] >= star ? "fill-white" : "")} />
                        </button>
                      ))}
                      <span className="ml-4 text-sm font-medium text-[var(--color-text-muted)]">
                        {ratings[comp.id] === 1 ? "Poor" :
                         ratings[comp.id] === 2 ? "Fair" :
                         ratings[comp.id] === 3 ? "Good" :
                         ratings[comp.id] === 4 ? "Very Good" :
                         ratings[comp.id] === 5 ? "Excellent" : "Unrated"}
                      </span>
                    </div>
                    
                    <textarea
                      placeholder="Provide specific examples and observations..."
                      value={notes[comp.id] || ""}
                      onChange={(e) => setNotes({ ...notes, [comp.id]: e.target.value })}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl p-4 text-white text-sm outline-none transition-all shadow-inner placeholder-[var(--color-text-muted)] min-h-[100px] resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-8 rounded-3xl border border-[var(--color-border)]"
          >
            <h2 className="text-xl font-bold text-white mb-6 border-b border-[var(--color-border)] pb-4">
              Overall Recommendation
            </h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { id: "reject", label: "Reject", color: "hover:border-red-500 hover:bg-red-500/10", active: "border-red-500 bg-red-500/20 text-red-200" },
                { id: "hold", label: "Hold", color: "hover:border-orange-500 hover:bg-orange-500/10", active: "border-orange-500 bg-orange-500/20 text-orange-200" },
                { id: "select", label: "Select", color: "hover:border-emerald-500 hover:bg-emerald-500/10", active: "border-emerald-500 bg-emerald-500/20 text-emerald-200" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setOverallRecommendation(option.id)}
                  className={clsx(
                    "p-4 rounded-xl border font-bold text-sm transition-all",
                    overallRecommendation === option.id 
                      ? option.active 
                      : `border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] ${option.color}`
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(ratings).length < competencies.length}
                className="px-8 py-4 bg-gradient-primary hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Blind Scorecard
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </form>
      )}
    </div>
  );
}
