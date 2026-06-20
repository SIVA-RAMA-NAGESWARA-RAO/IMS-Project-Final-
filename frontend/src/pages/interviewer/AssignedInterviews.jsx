import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import * as interviewsApi from '../../api/interviews';
import * as feedbackApi from '../../api/feedback';

const FeedbackForm = ({ interview, onSubmitted }) => {
  const [form, setForm] = useState({ rating: 5, recommendation: 'select', strengths: '', concerns: '', comments: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await feedbackApi.submitFeedback({ interviewId: interview._id, ...form });
      onSubmitted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </Select>
        <Select label="Recommendation" value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}>
          <option value="select">Select</option>
          <option value="hold">Hold</option>
          <option value="reject">Reject</option>
        </Select>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">Strengths</span>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={form.strengths}
          onChange={(e) => setForm({ ...form, strengths: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">Concerns</span>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          value={form.concerns}
          onChange={(e) => setForm({ ...form, concerns: e.target.value })}
        />
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? 'Submitting…' : 'Submit feedback'}
      </Button>
    </form>
  );
};

const AssignedInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [openFeedbackId, setOpenFeedbackId] = useState(null);

  const refresh = () => interviewsApi.listInterviews().then(setInterviews);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <DashboardLayout title="Assigned interviews">
      {interviews.length === 0 ? (
        <EmptyState title="No interviews assigned" message="HR will assign you to interview panels as candidates progress." />
      ) : (
        <div className="grid gap-3">
          {interviews.map((iv) => (
            <Card key={iv._id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink dark:text-ink-dark">{iv.application?.candidate?.name} — {iv.application?.job?.title}</p>
                  <p className="text-xs text-muted dark:text-muted-dark">
                    Round {iv.round} · {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode} ·{' '}
                    <span className="data-mono">{iv.status}</span>
                  </p>
                </div>
                {iv.status !== 'completed' && (
                  <Button variant="secondary" onClick={() => setOpenFeedbackId(openFeedbackId === iv._id ? null : iv._id)}>
                    {openFeedbackId === iv._id ? 'Close' : 'Submit feedback'}
                  </Button>
                )}
              </div>
              {openFeedbackId === iv._id && (
                <FeedbackForm
                  interview={iv}
                  onSubmitted={() => {
                    setOpenFeedbackId(null);
                    refresh();
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AssignedInterviews;
