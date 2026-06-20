import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      // Registration only creates the account — it's inert until the
      // emailed OTP is verified, so we route there next instead of logging in.
      navigate('/verify-otp', { state: { email: form.email, purpose: 'registration' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Interview Management System" title="Create your account" subtitle="Set up access for your role in the hiring process">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label="Password"
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select label="I am a…" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="candidate">Candidate</option>
          <option value="hr">HR / Admin</option>
          <option value="interviewer">Interviewer</option>
        </Select>
        {error && <p className="text-sm text-clay">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted dark:text-muted-dark">
        Already have an account?{' '}
        <Link to="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
