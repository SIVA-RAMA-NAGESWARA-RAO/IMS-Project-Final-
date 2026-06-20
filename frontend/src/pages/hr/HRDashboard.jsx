import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import PipelineBar from '../../components/pipeline/PipelineBar';
import * as analyticsApi from '../../api/analytics';
import * as jobsApi from '../../api/jobs';

const HRDashboard = () => {
  const [funnel, setFunnel] = useState({});
  const [openJobs, setOpenJobs] = useState([]);

  useEffect(() => {
    analyticsApi.funnelSummary().then(setFunnel).catch(() => setFunnel({}));
    jobsApi
      .listJobs({ status: 'open', limit: 100 })
      .then((data) => setOpenJobs(data.jobs))
      .catch(() => setOpenJobs([]));
  }, []);

  return (
    <DashboardLayout title="HR dashboard">
      <div className="mb-6">
        <PipelineBar counts={funnel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Open positions</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{openJobs.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Candidates applied</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{funnel['Applied'] || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Offers released</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{funnel['Offer Released'] || 0}</p>
        </Card>
      </div>

      <h2 className="font-display text-lg text-ink dark:text-ink-dark mt-8 mb-3">Open job postings</h2>
      <div className="grid gap-3">
        {openJobs.map((job) => (
          <Card key={job._id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink dark:text-ink-dark">{job.title}</p>
              <p className="text-xs text-muted dark:text-muted-dark">{job.department} · {job.location}</p>
            </div>
            <span className="data-mono text-xs text-muted dark:text-muted-dark">posted {new Date(job.createdAt).toLocaleDateString()}</span>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
