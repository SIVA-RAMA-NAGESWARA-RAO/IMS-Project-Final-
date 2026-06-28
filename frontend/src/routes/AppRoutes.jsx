import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyOtp from '../pages/auth/VerifyOtp';
import ForgotPassword from '../pages/auth/ForgotPassword';
import NotFound from '../pages/NotFound';

import CandidateDashboard from '../pages/candidate/CandidateDashboard';
import JobBoard from '../pages/candidate/JobBoard';
import MyApplications from '../pages/candidate/MyApplications';
import MyInterviews from '../pages/candidate/MyInterviews';
import Profile from '../pages/candidate/Profile';

import HRDashboard from '../pages/hr/HRDashboard';
import JobManagement from '../pages/hr/JobManagement';
import CandidatesList from '../pages/hr/CandidatesList';
import ApplicationReview from '../pages/hr/ApplicationReview';
import InterviewScheduling from '../pages/hr/InterviewScheduling';
import InterviewerAssignment from '../pages/hr/InterviewerAssignment';
import OfferManagement from '../pages/hr/OfferManagement';
import Reports from '../pages/hr/Reports';
import AuditLogPage from '../pages/hr/AuditLogPage';

// Enterprise Modules
import AgentCommandCenter from '../components/agent/AgentCommandCenter';
import HrAnalyticsDashboard from '../pages/hr/HrAnalyticsDashboard';

import InterviewerDashboard from '../pages/interviewer/InterviewerDashboard';
import AssignedInterviews from '../pages/interviewer/AssignedInterviews';

const roleHome = { candidate: '/candidate', hr: '/hr', interviewer: '/interviewer', admin: '/hr' };

const Home = () => {
  const { user } = useAuth();
  return <Navigate to={user ? roleHome[user.role] || '/login' : '/login'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-otp" element={<VerifyOtp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />

    <Route path="/candidate" element={<ProtectedRoute roles={['candidate']}><CandidateDashboard /></ProtectedRoute>} />
    <Route path="/candidate/jobs" element={<ProtectedRoute roles={['candidate']}><JobBoard /></ProtectedRoute>} />
    <Route path="/candidate/applications" element={<ProtectedRoute roles={['candidate']}><MyApplications /></ProtectedRoute>} />
    <Route path="/candidate/interviews" element={<ProtectedRoute roles={['candidate']}><MyInterviews /></ProtectedRoute>} />
    <Route path="/candidate/profile" element={<ProtectedRoute roles={['candidate']}><Profile /></ProtectedRoute>} />

    {/* HR routes — also accessible by admin role */}
    <Route path="/hr" element={<ProtectedRoute roles={['hr', 'admin']}><HRDashboard /></ProtectedRoute>} />
    <Route path="/hr/jobs" element={<ProtectedRoute roles={['hr', 'admin']}><JobManagement /></ProtectedRoute>} />
    <Route path="/hr/candidates" element={<ProtectedRoute roles={['hr', 'admin']}><CandidatesList /></ProtectedRoute>} />
    <Route path="/hr/applications" element={<ProtectedRoute roles={['hr', 'admin']}><ApplicationReview /></ProtectedRoute>} />
    <Route path="/hr/interviews" element={<ProtectedRoute roles={['hr', 'admin']}><InterviewScheduling /></ProtectedRoute>} />
    <Route path="/hr/interviewers" element={<ProtectedRoute roles={['hr', 'admin']}><InterviewerAssignment /></ProtectedRoute>} />
    <Route path="/hr/offers" element={<ProtectedRoute roles={['hr', 'admin']}><OfferManagement /></ProtectedRoute>} />
    <Route path="/hr/reports" element={<ProtectedRoute roles={['hr', 'admin']}><Reports /></ProtectedRoute>} />
    <Route path="/hr/audit" element={<ProtectedRoute roles={['hr', 'admin']}><AuditLogPage /></ProtectedRoute>} />

    {/* Enterprise AI Modules */}
    <Route path="/hr/agent" element={<ProtectedRoute roles={['hr', 'admin']}><AgentCommandCenter /></ProtectedRoute>} />
    <Route path="/hr/analytics" element={<ProtectedRoute roles={['hr', 'admin']}><HrAnalyticsDashboard /></ProtectedRoute>} />

    <Route path="/interviewer" element={<ProtectedRoute roles={['interviewer']}><InterviewerDashboard /></ProtectedRoute>} />
    <Route path="/interviewer/assignments" element={<ProtectedRoute roles={['interviewer']}><AssignedInterviews /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
