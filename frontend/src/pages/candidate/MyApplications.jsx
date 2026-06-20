import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import JourneyStepper from '../../components/pipeline/JourneyStepper';
import * as applicationsApi from '../../api/applications';
import * as offersApi from '../../api/offers';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsApi
      .myApplications()
      .then((apps) => {
        setApplications(apps);
        if (apps.length) setSelected(apps[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected?.status === 'Offer Released') {
      offersApi.listOffers({ applicationId: selected._id }).then(setOffers);
    } else {
      setOffers([]);
    }
  }, [selected]);

  const respond = async (offerId, decision) => {
    await offersApi.respondToOffer(offerId, decision);
    const updated = await offersApi.listOffers({ applicationId: selected._id });
    setOffers(updated);
  };

  return (
    <DashboardLayout title="My applications">
      {loading ? (
        <p className="text-sm text-muted dark:text-muted-dark">Loading…</p>
      ) : applications.length === 0 ? (
        <EmptyState title="No applications yet" message="Once you apply to a role, you'll be able to track its progress here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-3">
            {applications.map((app) => (
              <Card
                key={app._id}
                onClick={() => setSelected(app)}
                className={`cursor-pointer ${selected?._id === app._id ? 'ring-2 ring-brand' : ''}`}
              >
                <p className="font-medium text-ink dark:text-ink-dark">{app.job?.title}</p>
                <p className="text-xs text-muted dark:text-muted-dark mb-2">{app.job?.department}</p>
                <Badge status={app.status} />
              </Card>
            ))}
          </div>

          {selected && (
            <Card className="lg:col-span-2">
              <h2 className="font-display text-xl text-ink dark:text-ink-dark">{selected.job?.title}</h2>
              <p className="text-sm text-muted dark:text-muted-dark mb-6">{selected.job?.department} · {selected.job?.location}</p>

              <JourneyStepper currentStatus={selected.status} />

              {offers.map((offer) => (
                <div key={offer._id} className="mt-6 rounded-card border border-border bg-moss-light p-4">
                  <p className="font-medium text-ink dark:text-ink-dark">Offer: {offer.designation}</p>
                  <p className="text-sm text-muted dark:text-muted-dark">Salary: {offer.salary} · Joining: {new Date(offer.joiningDate).toLocaleDateString()}</p>
                  {offer.status === 'pending' ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => respond(offer._id, 'accepted')}
                        className="rounded-lg bg-moss px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Accept offer
                      </button>
                      <button
                        onClick={() => respond(offer._id, 'rejected')}
                        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink dark:text-ink-dark"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <Badge status={offer.status === 'accepted' ? 'Selected' : 'Rejected'} />
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyApplications;
