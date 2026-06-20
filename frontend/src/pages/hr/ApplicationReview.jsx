import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import * as applicationsApi from '../../api/applications';
import { STAGES, REJECTED_STAGE } from '../../components/pipeline/pipelineConfig';

const ApplicationReview = () => {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchApplications = (status, p = 1) => {
    setLoading(true);
    applicationsApi
      .listApplications({ ...(status ? { status } : {}), page: p })
      .then((data) => {
        setApplications(data.applications);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const changeStatus = async (id, status) => {
    try {
      await applicationsApi.updateApplicationStatus(id, status);
      showToast(`Status updated to "${status}". Candidate notified by email.`, 'success');
      fetchApplications(statusFilter, page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update status.', 'error');
    }
  };

  const allStages = [...STAGES, REJECTED_STAGE];

  return (
    <DashboardLayout title="Application review">
      <div className="mb-4 max-w-xs">
        <Select
          label="Filter by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            fetchApplications(e.target.value, 1);
          }}
        >
          <option value="">All statuses</option>
          {allStages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : applications.length === 0 ? (
        <EmptyState title="No applications found" message="Try a different status filter." />
      ) : (
        <>
          <div className="grid gap-3">
            {applications.map((app) => (
              <Card key={app._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink dark:text-ink-dark">{app.candidate?.name}</p>
                  <p className="text-xs text-muted dark:text-muted-dark">{app.candidate?.email} · applying for {app.job?.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={app.status} />
                  <Select
                    className="!py-1.5"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) changeStatus(app._id, e.target.value);
                    }}
                  >
                    <option value="">Move to…</option>
                    {allStages
                      .filter((s) => s.key !== app.status)
                      .map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                  </Select>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => fetchApplications(statusFilter, p)} />
        </>
      )}
    </DashboardLayout>
  );
};

export default ApplicationReview;
