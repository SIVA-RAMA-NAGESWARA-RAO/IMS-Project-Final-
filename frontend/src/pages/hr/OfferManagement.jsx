import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import * as applicationsApi from '../../api/applications';
import * as offersApi from '../../api/offers';

const OfferManagement = () => {
  const [selectedApps, setSelectedApps] = useState([]);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({ applicationId: '', salary: '', designation: '', joiningDate: '', isBackup: false });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const refresh = () => {
    applicationsApi.listApplications({ status: 'Selected', limit: 100 }).then((data) => setSelectedApps(data.applications));
    offersApi.listOffers().then(setOffers);
  };

  useEffect(() => {
    refresh();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await offersApi.createOffer(form);
      setForm({ applicationId: '', salary: '', designation: '', joiningDate: '', isBackup: false });
      showToast('Offer released. Candidate notified by email.', 'success');
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send offer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onboard = async (id) => {
    await offersApi.initiateOnboarding(id);
    showToast('Onboarding initiated.', 'success');
    refresh();
  };

  return (
    <DashboardLayout title="Offers & onboarding">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-lg text-ink mb-4">Release offer letter</h2>
          <form onSubmit={submit} className="space-y-3">
            <Select
              label="Selected candidate"
              required
              value={form.applicationId}
              onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
            >
              <option value="">Select an application…</option>
              {selectedApps.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.candidate?.name} — {app.job?.title}
                </option>
              ))}
            </Select>
            <Input label="Designation" required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <Input label="Salary" required value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            <Input
              label="Joining date"
              type="date"
              required
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isBackup}
                onChange={(e) => setForm({ ...form, isBackup: e.target.checked })}
              />
              This is a backup-candidate offer
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sending…' : 'Send offer'}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {offers.length === 0 ? (
            <EmptyState title="No offers sent yet" message="Offers you release will appear here for tracking." />
          ) : (
            offers.map((offer) => (
              <Card key={offer._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {offer.application?.candidate?.name} — {offer.designation}
                    {offer.isBackup && <span className="ml-2 text-xs text-signal">(backup)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {offer.application?.job?.title} · {offer.salary} · status: <span className="data-mono">{offer.status}</span>
                  </p>
                </div>
                {offer.status === 'accepted' && !offer.onboardingInitiated && (
                  <Button variant="secondary" onClick={() => onboard(offer._id)}>
                    Initiate onboarding
                  </Button>
                )}
                {offer.onboardingInitiated && <span className="text-xs text-moss">Onboarding started</span>}
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OfferManagement;
