import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import PipelineBar from '../../components/pipeline/PipelineBar';
import * as analyticsApi from '../../api/analytics';

// Reports & Analytics (Module 10). The funnel comes straight from
// MongoDB for speed; time-to-hire and interviewer-performance are
// proxied through to the Python service, which runs SQL aggregations
// against PostgreSQL — that's where relational joins genuinely help.
const Reports = () => {
  const [funnel, setFunnel] = useState({});
  const [timeToHire, setTimeToHire] = useState([]);
  const [interviewerPerf, setInterviewerPerf] = useState([]);
  const [serviceError, setServiceError] = useState(false);

  useEffect(() => {
    analyticsApi.funnelSummary().then(setFunnel).catch(() => {});
    Promise.all([analyticsApi.timeToHire(), analyticsApi.interviewerPerformance()])
      .then(([ttf, perf]) => {
        setTimeToHire(ttf);
        setInterviewerPerf(perf);
      })
      .catch(() => setServiceError(true));
  }, []);

  return (
    <DashboardLayout title="Reports & analytics">
      <div className="mb-6">
        <PipelineBar counts={funnel} />
      </div>

      {serviceError && (
        <Card className="mb-6 border-signal bg-signal-light">
          <p className="text-sm text-ink dark:text-ink-dark">
            The analytics service (Python + PostgreSQL) isn't reachable right now, so time-to-hire and interviewer
            performance can't be shown. The funnel above runs directly off MongoDB and is unaffected.
          </p>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-4">Average time to offer, by job</h2>
          {timeToHire.length === 0 ? (
            <p className="text-sm text-muted dark:text-muted-dark">No completed hiring cycles yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted dark:text-muted-dark">
                  <th className="pb-2">Job ID</th>
                  <th className="pb-2">Offers made</th>
                  <th className="pb-2">Avg. days</th>
                </tr>
              </thead>
              <tbody className="data-mono">
                {timeToHire.map((row) => (
                  <tr key={row.job_id} className="border-t border-border">
                    <td className="py-2">{row.job_id}</td>
                    <td className="py-2">{row.offers_made}</td>
                    <td className="py-2">{row.avg_days_to_offer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-4">Interviewer performance</h2>
          {interviewerPerf.length === 0 ? (
            <p className="text-sm text-muted dark:text-muted-dark">No feedback submitted yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted dark:text-muted-dark">
                  <th className="pb-2">Interviewer ID</th>
                  <th className="pb-2">Feedback count</th>
                  <th className="pb-2">Avg. rating</th>
                </tr>
              </thead>
              <tbody className="data-mono">
                {interviewerPerf.map((row) => (
                  <tr key={row.interviewer_id} className="border-t border-border">
                    <td className="py-2">{row.interviewer_id}</td>
                    <td className="py-2">{row.feedback_count}</td>
                    <td className="py-2">{row.avg_rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
