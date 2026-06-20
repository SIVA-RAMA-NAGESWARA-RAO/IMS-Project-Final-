import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import * as interviewsApi from '../../api/interviews';

const MyInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewsApi
      .listInterviews()
      .then(setInterviews)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="My interviews">
      {loading ? (
        <p className="text-sm text-muted dark:text-muted-dark">Loading…</p>
      ) : interviews.length === 0 ? (
        <EmptyState title="No interviews scheduled" message="When HR schedules an interview for one of your applications, it will appear here." />
      ) : (
        <div className="grid gap-3">
          {interviews.map((iv) => (
            <Card key={iv._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink dark:text-ink-dark">{iv.application?.job?.title} — Round {iv.round}</p>
                <p className="text-xs text-muted dark:text-muted-dark">
                  {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode}
                  {iv.meetingLink && (
                    <>
                      {' · '}
                      <a href={iv.meetingLink} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                        Join link
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span className="data-mono text-xs uppercase text-muted dark:text-muted-dark">{iv.status}</span>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyInterviews;
