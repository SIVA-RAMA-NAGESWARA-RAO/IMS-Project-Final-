import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import * as jobsApi from '../../api/jobs';
import * as applicationsApi from '../../api/applications';

const JobBoard = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const { showToast } = useToast();

  const fetchJobs = (q, p = 1) => {
    setLoading(true);
    jobsApi
      .listJobs({ ...(q ? { q } : {}), page: p })
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

  const apply = async (jobId) => {
    try {
      await applicationsApi.applyToJob({ jobId });
      setAppliedIds((prev) => new Set(prev).add(jobId));
      showToast('Application submitted.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not apply to this job.', 'error');
    }
  };

  return (
    <DashboardLayout title="Browse jobs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchJobs(query, 1);
        }}
        className="mb-6 flex max-w-md gap-2"
      >
        <Input placeholder="Search by title, skill, or keyword" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <SkeletonList rows={4} />
      ) : jobs.length === 0 ? (
        <EmptyState title="No open roles right now" message="Check back soon — new postings appear here as soon as HR publishes them." />
      ) : (
        <>
          <div className="grid gap-3">
            {jobs.map((job) => (
              <Card key={job._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink dark:text-ink-dark">{job.title}</p>
                  <p className="text-xs text-muted dark:text-muted-dark">
                    {job.department} · {job.location} · {job.employmentType}
                  </p>
                  {job.skillsRequired?.length > 0 && (
                    <p className="mt-1 text-xs text-muted dark:text-muted-dark">Skills: {job.skillsRequired.join(', ')}</p>
                  )}
                </div>
                <Button onClick={() => apply(job._id)} disabled={appliedIds.has(job._id)}>
                  {appliedIds.has(job._id) ? 'Applied' : 'Apply'}
                </Button>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchJobs(query, p)} />
        </>
      )}
    </DashboardLayout>
  );
};

export default JobBoard;
