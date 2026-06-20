import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import * as candidatesApi from '../../api/candidates';

// "View Candidates" (HR feature) — search the full candidate pool by
// skill or location, independent of any specific job's applications.
const CandidatesList = () => {
  const [candidates, setCandidates] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCandidates = (p = 1) => {
    setLoading(true);
    candidatesApi
      .listCandidates({ ...(skill ? { skill } : {}), ...(location ? { location } : {}), page: p })
      .then((data) => {
        setCandidates(data.candidates);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return (
    <DashboardLayout title="Candidates">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchCandidates(1);
        }}
        className="mb-6 flex max-w-xl gap-2"
      >
        <Input placeholder="Filter by skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
        <Input placeholder="Filter by location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <SkeletonList rows={4} />
      ) : candidates.length === 0 ? (
        <EmptyState title="No candidates found" message="Try clearing the filters, or check back once candidates start applying." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {candidates.map((c) => (
              <Card key={c._id}>
                <p className="font-medium text-ink dark:text-ink-dark">{c.user?.name}</p>
                <p className="text-xs text-muted dark:text-muted-dark mb-2">{c.user?.email} · {c.user?.phone}</p>
                {c.headline && <p className="text-sm text-ink dark:text-ink-dark mb-1">{c.headline}</p>}
                <p className="text-xs text-muted dark:text-muted-dark">
                  {c.experienceYears ?? 0} yrs experience{c.location ? ` · ${c.location}` : ''}
                </p>
                {c.skills?.length > 0 && (
                  <p className="mt-2 text-xs text-muted dark:text-muted-dark">Skills: {c.skills.join(', ')}</p>
                )}
                {c.resumeUrl && (
                  <a href={c.resumeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand hover:underline">
                    View resume
                  </a>
                )}
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={fetchCandidates} />
        </>
      )}
    </DashboardLayout>
  );
};

export default CandidatesList;
