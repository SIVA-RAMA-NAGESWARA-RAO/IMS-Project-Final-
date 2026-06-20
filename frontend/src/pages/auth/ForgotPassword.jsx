import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as authApi from '../../api/auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setLoading(false);
      // Always proceed to the OTP screen — the API deliberately never
      // reveals whether the email exists, to avoid account enumeration.
      navigate('/verify-otp', { state: { email, purpose: 'password_reset' } });
    }
  };

  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password" subtitle="We'll email a verification code to reset your password">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send verification code'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link to="/login" className="text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;
