import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as authApi from '../../api/auth';

const roleHome = { candidate: '/candidate', hr: '/hr', interviewer: '/interviewer' };

// Handles both flows that end in an OTP: registration (verifies + logs in)
// and password reset (verifies + sets a new password). `purpose` from
// router state decides which branch renders.
const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  const { showToast } = useToast();

  const email = location.state?.email || '';
  const purpose = location.state?.purpose || 'registration';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    setError('');
    try {
      const res = await authApi.resendOtp(email, purpose);
      setCooldown(res.resendCooldownSeconds || 60);
      showToast('A new code has been sent to your email.', 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code.');
      if (err.response?.data?.retryAfterSeconds) setCooldown(err.response.data.retryAfterSeconds);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (purpose === 'registration') {
        const user = await verifyOtp(email, code);
        showToast('Account verified — welcome!', 'success');
        navigate(roleHome[user.role] || '/');
      } else {
        await authApi.resetPassword(email, code, newPassword);
        showToast('Password updated. Please sign in.', 'success');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Email verification"
      title={purpose === 'registration' ? 'Verify your email' : 'Reset your password'}
      subtitle={`We sent a 6-digit code to ${email}`}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Verification code"
          inputMode="numeric"
          maxLength={8}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
        />
        {purpose === 'password_reset' && (
          <Input
            label="New password"
            type="password"
            minLength={6}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        )}
        {error && <p className="text-sm text-clay">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : purpose === 'registration' ? 'Verify & continue' : 'Reset password'}
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="text-brand hover:underline disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
        </button>
        <Link to="/login" className="text-brand hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
};

export default VerifyOtp;
