import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const roleHome = { candidate: '/candidate', hr: '/hr', interviewer: '/interviewer' };

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(roleHome[user.role] || '/');
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

  return (
    <AuthShell eyebrow="Interview Management System" title="Welcome back" subtitle="Sign in to continue your recruitment work">
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
