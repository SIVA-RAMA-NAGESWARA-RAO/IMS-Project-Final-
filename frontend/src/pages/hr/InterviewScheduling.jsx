import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import * as applicationsApi from '../../api/applications';
import * as interviewsApi from '../../api/interviews';
import * as interviewersApi from '../../api/interviewers';

const InterviewScheduling = () => {
  const [shortlisted, setShortlisted] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [form, setForm] = useState({ applicationId: '', scheduledAt: '', mode: 'video', location: '', meetingLink: '', interviewers: [] });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const refresh = () => {
    applicationsApi.listApplications({ status: 'Shortlisted', limit: 100 }).then((data) => setShortlisted(data.applications));
    interviewsApi.listInterviews().then(setInterviews);
    interviewersApi.listInterviewers().then(setInterviewers);
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.applicationId || !form.scheduledAt) return;
    setSaving(true);
    try {
      await interviewsApi.scheduleInterview(form);
      setForm({ applicationId: '', scheduledAt: '', mode: 'video', location: '', meetingLink: '', interviewers: [] });
      showToast('Interview scheduled. Candidate notified by email.', 'success');
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not schedule interview.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reschedule = async (id) => {
    const newTime = prompt('New date/time (e.g. 2026-07-01T14:00):');
    if (!newTime) return;
    await interviewsApi.rescheduleInterview(id, newTime);
    showToast('Interview rescheduled. Candidate notified by email.', 'success');
    refresh();
  };

  const cancel = async (id) => {
    await interviewsApi.cancelInterview(id);
    showToast('Interview cancelled.', 'success');
    refresh();
  };

  return (
    <DashboardLayout title="Interview scheduling">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-ink mb-4">Schedule interview</h2>
          <form onSubmit={submit} className="space-y-3">
            <Select
              label="Shortlisted candidate"
              required
              value={form.applicationId}
              onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
            >
              <option value="">Select an application…</option>
              {shortlisted.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.candidate?.name} — {app.job?.title}
                </option>
              ))}
            </Select>
            <Input
              label="Date & time"
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
            <Select label="Mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="video">Video</option>
              <option value="onsite">Onsite</option>
              <option value="phone">Phone</option>
            </Select>
            {form.mode === 'onsite' ? (
              <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            ) : (
              <Input label="Meeting link" value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} />
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Interviewers</span>
              <select
                multiple
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                value={form.interviewers}
                onChange={(e) => setForm({ ...form, interviewers: Array.from(e.target.selectedOptions, (o) => o.value) })}
              >
                {interviewers.map((iv) => (
                  <option key={iv._id} value={iv._id}>
                    {iv.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule interview'}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display text-lg text-ink mb-1">Upcoming &amp; past interviews</h2>
          {interviews.length === 0 ? (
            <EmptyState title="No interviews yet" message="Scheduled interviews will appear here." />
          ) : (
            interviews.map((iv) => (
              <Card key={iv._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {iv.application?.candidate?.name} — {iv.application?.job?.title}
                  </p>
                  <p className="text-xs text-muted">
                    Round {iv.round} · {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode} ·{' '}
                    <span className="data-mono">{iv.status}</span>
                  </p>
                </div>
                {iv.status === 'scheduled' && (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => reschedule(iv._id)}>
                      Reschedule
                    </Button>
                    <Button variant="danger" onClick={() => cancel(iv._id)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InterviewScheduling;
