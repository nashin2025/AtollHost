import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { isAuthConfigured } from '../../lib/config';
import { listMyMemberships } from '../../lib/memberships';
import { listOwnerPropertyAccess } from '../../lib/ownerPortal';
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
    if (typeof from === 'string' && from.startsWith('/')) {
      navigate(from);
      return;
    }
    // Owner-only accounts have no organization membership, so send them to
    // the owner portal instead of an empty agency workspace.
    if (supabase) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const [memberships, ownerAccess] = userData.user
          ? await Promise.all([
              listMyMemberships(supabase),
              listOwnerPropertyAccess(supabase, userData.user.id),
            ])
          : [[], []];
        if (
          memberships.length === 0 &&
          ownerAccess.some((row) => row.revoked_at === null)
        ) {
          navigate(paths.owner, { replace: true });
          return;
        }
      } catch {
        // Fall through to the default landing; a failed lookup is not a
        // failed sign in.
      }
    }
    navigate(paths.overview);
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
