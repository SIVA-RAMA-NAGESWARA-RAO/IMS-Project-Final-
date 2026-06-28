import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const roleHome = { candidate: '/candidate', hr: '/hr', interviewer: '/interviewer' };

const Login = () => {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result?.requiresOtp) {
        setTempToken(result.tempToken);
        setOtpStep(true);
      } else {
        navigate(roleHome[result.role] || '/');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Could not sign in. Check your credentials.';
      setError(message);
      if (err.response?.status === 403 && /verify your email/i.test(message)) {
        setUnverified(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await completeLogin(tempToken, otpCode);
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid verification code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Interview Management System" title="Welcome back" subtitle="Sign in to continue your recruitment work">
      {!otpStep ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          {error && (
            <p className="text-sm text-clay">
              {error}
              {unverified && (
                <>
                  {' '}
                  <Link
                    to="/verify-otp"
                    state={{ email: form.email, purpose: 'registration' }}
                    className="underline"
                  >
                    Verify now
                  </Link>
                </>
              )}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4">
          <Input
            label="Verification code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="123456"
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
            {loading ? 'Verifying…' : 'Verify code'}
          </Button>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              setOtpStep(false);
              setTempToken('');
              setOtpCode('');
              setError('');
            }}
          >
            Back to password sign-in
          </Button>
        </form>
      )}
      <div className="mt-5 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-brand hover:underline">
          Forgot password?
        </Link>
        <Link to="/register" className="text-brand hover:underline">
          Create an account
        </Link>
      </div>
    </AuthShell>
  );
};

export default Login;
