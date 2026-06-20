import React from 'react';
import { NavLink } from 'react-router-dom';

const linksByRole = {
  candidate: [
    { to: '/candidate', label: 'Dashboard' },
    { to: '/candidate/jobs', label: 'Browse jobs' },
    { to: '/candidate/applications', label: 'My applications' },
    { to: '/candidate/interviews', label: 'My interviews' },
    { to: '/candidate/profile', label: 'Profile' },
  ],
  hr: [
    { to: '/hr', label: 'Dashboard' },
    { to: '/hr/jobs', label: 'Job postings' },
    { to: '/hr/candidates', label: 'Candidates' },
    { to: '/hr/applications', label: 'Applications' },
    { to: '/hr/interviews', label: 'Interview scheduling' },
    { to: '/hr/interviewers', label: 'Interviewer panels' },
    { to: '/hr/offers', label: 'Offers & onboarding' },
    { to: '/hr/reports', label: 'Reports & analytics' },
    { to: '/hr/audit', label: 'Audit log' },
  ],
  interviewer: [
    { to: '/interviewer', label: 'Dashboard' },
    { to: '/interviewer/assignments', label: 'Assigned interviews' },
  ],
};

const Sidebar = ({ role }) => (
  <aside className="hidden md:flex w-60 flex-col border-r border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-6">
    <div className="mb-8 px-2">
      <p className="font-display text-xl text-ink dark:text-ink-dark">IMS</p>
      <p className="text-xs text-muted dark:text-muted-dark">Interview Management System</p>
    </div>
    <nav className="flex flex-col gap-1">
      {(linksByRole[role] || []).map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-light text-brand'
                : 'text-ink dark:text-ink-dark hover:bg-canvas dark:hover:bg-canvas-dark'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;
