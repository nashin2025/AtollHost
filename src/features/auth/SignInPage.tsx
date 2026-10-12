import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { isAuthConfigured } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthConfigured || !supabase) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Sign in</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to enable
              sign in.
            </p>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const from = (location.state as { from?: unknown } | null)?.from;
    navigate(
      typeof from === 'string' && from.startsWith('/')
        ? from
        : paths.overview,
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </form>
        <p>
          New to AtollHost? <Link to={paths.signUp}>Create an account</Link>{' '}
          or{' '}
          <Link to={paths.forgotPassword}>reset your password</Link>
        </p>
      </div>
    </main>
  );
}
