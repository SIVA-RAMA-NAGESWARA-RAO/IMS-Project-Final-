import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import * as applicationsApi from '../../api/applications';

const CandidateDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsApi
      .myApplications()
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  const active = applications.filter((a) => !['Rejected'].includes(a.status));

  return (
    <DashboardLayout title="My dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Active applications</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{active.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Total applications</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">{applications.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted dark:text-muted-dark">Offers received</p>
          <p className="data-mono mt-1 text-2xl font-semibold text-ink dark:text-ink-dark">
            {applications.filter((a) => a.status === 'Offer Released').length}
          </p>
        </Card>
      </div>

      <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-3">Recent applications</h2>
      {loading ? (
        <p className="text-sm text-muted dark:text-muted-dark">Loading…</p>
      ) : applications.length === 0 ? (
        <EmptyState title="No applications yet" message="Browse open roles and apply to start your journey." />
      ) : (
        <div className="grid gap-3">
          {applications.slice(0, 5).map((app) => (
            <Card key={app._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink dark:text-ink-dark">{app.job?.title}</p>
                <p className="text-xs text-muted dark:text-muted-dark">{app.job?.department} · {app.job?.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={app.status} />
                <Link to="/candidate/applications" className="text-sm text-brand hover:underline">
                  View
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CandidateDashboard;
