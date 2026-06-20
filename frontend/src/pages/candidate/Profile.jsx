import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import * as candidatesApi from '../../api/candidates';

const Profile = () => {
  const [profile, setProfile] = useState({ headline: '', skills: [], experienceYears: 0, location: '', resumeUrl: '', documents: [] });
  const [skillsInput, setSkillsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    candidatesApi.getMyCandidateProfile().then((p) => {
      setProfile(p);
      setSkillsInput((p.skills || []).join(', '));
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const updated = await candidatesApi.upsertMyCandidateProfile({ ...profile, skills });
      setProfile(updated);
      showToast('Profile saved.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onResumeFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const updated = await candidatesApi.uploadResumeFile(file);
      setProfile(updated);
      showToast('Resume uploaded.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Resume upload failed — PDF only, 5MB max.', 'error');
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  const onDocumentFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const updated = await candidatesApi.uploadDocumentFile(file);
      setProfile(updated);
      showToast('Document uploaded.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Document upload failed.', 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  return (
    <DashboardLayout title="My profile">
      <Card className="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <Input label="Headline" value={profile.headline || ''} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
          <Input
            label="Skills (comma-separated)"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder="React, Node.js, SQL"
          />
          <Input
            label="Years of experience"
            type="number"
            min="0"
            value={profile.experienceYears || 0}
            onChange={(e) => setProfile({ ...profile, experienceYears: Number(e.target.value) })}
          />
          <Input label="Location" value={profile.location || ''} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>

      <Card className="max-w-2xl mt-6">
        <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-1">Resume</h2>
        <p className="text-sm text-muted dark:text-muted-dark mb-3">PDF only, up to 5MB.</p>
        {profile.resumeUrl && (
          <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="block mb-3 text-sm text-brand hover:underline">
            Current resume on file →
          </a>
        )}
        <input type="file" accept="application/pdf" onChange={onResumeFileChange} disabled={uploadingResume} className="text-sm text-ink dark:text-ink-dark" />
        {uploadingResume && <p className="mt-2 text-xs text-muted dark:text-muted-dark">Uploading…</p>}
      </Card>

      <Card className="max-w-2xl mt-6">
        <h2 className="font-display text-lg text-ink dark:text-ink-dark mb-1">Documents</h2>
        <p className="text-sm text-muted dark:text-muted-dark mb-3">Certificates, ID proof, etc. PDF, PNG, or JPG.</p>
        <ul className="mb-3 space-y-1">
          {(profile.documents || []).map((doc, i) => (
            <li key={i}>
              <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
                {doc.name}
              </a>
            </li>
          ))}
        </ul>
        <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={onDocumentFileChange} disabled={uploadingDoc} className="text-sm text-ink dark:text-ink-dark" />
        {uploadingDoc && <p className="mt-2 text-xs text-muted dark:text-muted-dark">Uploading…</p>}
      </Card>
    </DashboardLayout>
  );
};

export default Profile;
