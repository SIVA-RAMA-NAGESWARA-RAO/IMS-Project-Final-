import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import * as interviewsApi from '../../api/interviews';

const InterviewerDashboard = () => {
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    interviewsApi.listInterviews().then(setInterviews);
  }, []);

  const upcoming = interviews.filter((iv) => iv.status === 'scheduled');

  return (
    <DashboardLayout title="Interviewer dashboard">
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Upcoming interviews</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{upcoming.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Total assigned</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{interviews.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Completed</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">
            {interviews.filter((iv) => iv.status === 'completed').length}
          </p>
        </Card>
      </div>

      <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-3">Next up</h2>
      {upcoming.length === 0 ? (
        <EmptyState title="Nothing on your schedule" message="New assignments from HR will show up here." />
      ) : (
        <div className="grid gap-3">
          {upcoming.slice(0, 5).map((iv) => (
            <Card key={iv._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink dark:text-ink-dark">{iv.application?.candidate?.name} — {iv.application?.job?.title}</p>
                <p className="text-xs text-muted dark:text-muted-dark">Round {iv.round} · {new Date(iv.scheduledAt).toLocaleString()}</p>
              </div>
              <span className="data-mono text-xs uppercase text-muted dark:text-muted-dark">{iv.mode}</span>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default InterviewerDashboard;
