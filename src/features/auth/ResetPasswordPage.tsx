import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { isAuthConfigured } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

function readAccessToken(): string | null {
  const fragment = window.location.hash.slice(1);
  if (!fragment) {
    return null;
  }
  const params = new URLSearchParams(fragment);
  return params.get('access_token');
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const accessToken = readAccessToken();

  if (!isAuthConfigured || !supabase) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Reset password</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to enable
              password reset.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!accessToken && !completed) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Reset link invalid</h1>
          <p role="alert">
            This password reset link is invalid or has expired. Request a new
            link to continue.
          </p>
          <Link to={paths.forgotPassword}>Request a new reset link</Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCompleted(true);
  }

  if (completed) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Password updated</h1>
          <p role="status">
            Your password has been changed. You are now signed in.
          </p>
          <Link to={paths.overview}>Go to overview</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Set new password</h1>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helper="At least 8 characters."
            required
          />
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading}>
            Update password
          </Button>
        </form>
      </div>
    </main>
  );
}
