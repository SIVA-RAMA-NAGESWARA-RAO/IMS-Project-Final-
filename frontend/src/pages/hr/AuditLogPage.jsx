import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import * as auditApi from '../../api/audit';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = (p = 1) => {
    setLoading(true);
    auditApi
      .listAuditLogs({ page: p })
      .then((data) => {
        setLogs(data.logs);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <DashboardLayout title="Audit log">
      {loading ? (
        <SkeletonList rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState title="No activity recorded yet" message="Security- and workflow-sensitive actions will appear here as they happen." />
      ) : (
        <>
          <div className="grid gap-2">
            {logs.map((log) => (
              <Card key={log._id} className="flex items-center justify-between !py-3">
                <div>
                  <p className="text-sm text-ink dark:text-ink-dark">
                    <span className="font-medium">{log.user?.name || 'System'}</span>{' '}
                    <span className="data-mono text-xs text-brand">{log.action}</span>
                    {log.entityType && <span className="text-muted dark:text-muted-dark"> · {log.entityType}</span>}
                  </p>
                  <p className="text-xs text-muted dark:text-muted-dark">{log.ip}</p>
                </div>
                <span className="data-mono text-xs text-muted dark:text-muted-dark">{new Date(log.createdAt).toLocaleString()}</span>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={fetchLogs} />
        </>
      )}
    </DashboardLayout>
  );
};

export default AuditLogPage;
