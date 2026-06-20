import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import * as jobsApi from '../../api/jobs';

const emptyForm = { title: '', description: '', department: '', location: '', skillsRequired: '' };

const JobManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchJobs = (p = 1) => {
    setLoading(true);
    jobsApi
      .listJobs({ status: 'all', page: p })
      .then((data) => {
        setJobs(data.jobs);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const startEdit = (job) => {
    setEditingId(job._id);
    setForm({
      title: job.title,
      description: job.description,
      department: job.department || '',
      location: job.location || '',
      skillsRequired: (job.skillsRequired || []).join(', '),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, skillsRequired: form.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (editingId) {
        await jobsApi.updateJob(editingId, payload);
        showToast('Job updated.', 'success');
      } else {
        await jobsApi.createJob(payload);
        showToast('Job published.', 'success');
      }
      resetForm();
      fetchJobs(page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save job.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const close = async (id) => {
    await jobsApi.closeJob(id);
    showToast('Job closed.', 'success');
    fetchJobs(page);
  };

  return (
    <DashboardLayout title="Job management">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-4">{editingId ? 'Edit job' : 'Create job opening'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">Description</span>
              <textarea
                required
                rows={4}
                className="w-full rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm text-ink dark:text-ink-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input
              label="Skills required (comma-separated)"
              value={form.skillsRequired}
              onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update job' : 'Publish job'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {loading ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Card key={job._id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink dark:text-ink-dark">{job.title}</p>
                      <p className="text-xs text-muted dark:text-muted-dark">
                        {job.department} · {job.location} ·{' '}
                        <span className={job.status === 'open' ? 'text-moss' : 'text-clay'}>{job.status}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(job)}>
                        Edit
                      </Button>
                      {job.status === 'open' && (
                        <Button variant="danger" onClick={() => close(job._id)}>
                          Close
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={fetchJobs} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobManagement;
