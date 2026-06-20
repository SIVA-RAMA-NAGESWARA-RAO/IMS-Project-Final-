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

import InterviewerDashboard from '../pages/interviewer/InterviewerDashboard';
import AssignedInterviews from '../pages/interviewer/AssignedInterviews';

const roleHome = { candidate: '/candidate', hr: '/hr', interviewer: '/interviewer' };

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

    <Route path="/hr" element={<ProtectedRoute roles={['hr']}><HRDashboard /></ProtectedRoute>} />
    <Route path="/hr/jobs" element={<ProtectedRoute roles={['hr']}><JobManagement /></ProtectedRoute>} />
    <Route path="/hr/candidates" element={<ProtectedRoute roles={['hr']}><CandidatesList /></ProtectedRoute>} />
    <Route path="/hr/applications" element={<ProtectedRoute roles={['hr']}><ApplicationReview /></ProtectedRoute>} />
    <Route path="/hr/interviews" element={<ProtectedRoute roles={['hr']}><InterviewScheduling /></ProtectedRoute>} />
    <Route path="/hr/interviewers" element={<ProtectedRoute roles={['hr']}><InterviewerAssignment /></ProtectedRoute>} />
    <Route path="/hr/offers" element={<ProtectedRoute roles={['hr']}><OfferManagement /></ProtectedRoute>} />
    <Route path="/hr/reports" element={<ProtectedRoute roles={['hr']}><Reports /></ProtectedRoute>} />
    <Route path="/hr/audit" element={<ProtectedRoute roles={['hr']}><AuditLogPage /></ProtectedRoute>} />

    <Route path="/interviewer" element={<ProtectedRoute roles={['interviewer']}><InterviewerDashboard /></ProtectedRoute>} />
    <Route path="/interviewer/assignments" element={<ProtectedRoute roles={['interviewer']}><AssignedInterviews /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
