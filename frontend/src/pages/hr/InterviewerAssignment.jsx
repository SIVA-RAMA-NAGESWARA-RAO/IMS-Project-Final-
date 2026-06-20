import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import * as interviewersApi from '../../api/interviewers';
import * as interviewsApi from '../../api/interviews';

const InterviewerAssignment = () => {
  const [interviewers, setInterviewers] = useState([]);
  const [assignmentsByInterviewer, setAssignmentsByInterviewer] = useState({});

  useEffect(() => {
    interviewersApi.listInterviewers().then(async (list) => {
      setInterviewers(list);
      const entries = await Promise.all(
        list.map(async (iv) => [iv._id, await interviewersApi.trackAssignments(iv._id)])
      );
      setAssignmentsByInterviewer(Object.fromEntries(entries));
    });
  }, []);

  return (
    <DashboardLayout title="Interviewer panels">
      {interviewers.length === 0 ? (
        <EmptyState title="No interviewers registered" message="Interviewer accounts will appear here once they register." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {interviewers.map((iv) => {
            const assignments = assignmentsByInterviewer[iv._id] || [];
            return (
              <Card key={iv._id}>
                <p className="font-medium text-ink dark:text-ink-dark">{iv.name}</p>
                <p className="text-xs text-muted dark:text-muted-dark mb-3">{iv.email}</p>
                <p className="data-mono text-xs uppercase text-muted dark:text-muted-dark mb-2">
                  {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-1">
                  {assignments.slice(0, 4).map((a) => (
                    <li key={a._id} className="text-sm text-ink dark:text-ink-dark">
                      {a.application?.job?.title} — {new Date(a.scheduledAt).toLocaleDateString()}{' '}
                      <span className="text-muted dark:text-muted-dark">({a.status})</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default InterviewerAssignment;
