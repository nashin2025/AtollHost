import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { isAuthConfigured } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!isAuthConfigured || !supabase) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Sign up</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to enable
              registration.
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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        setError(
          'An account with this email already exists. Sign in instead, or request a password reset.',
        );
      } else {
        setError(signUpError.message);
      }
      return;
    }
    setCompleted(true);
  }

  if (completed) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p role="status">
            We sent a verification link to <strong>{email}</strong>. Verify your
            email, then sign in.
          </p>
          <p className="auth-notice">
            Creating an account does not grant access to any organization.
            Organization access comes from an invitation or from creating a new
            organization after you sign in.
          </p>
          <Link to={paths.signIn}>Back to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Sign up</h1>
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
            autoComplete="new-password"
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
            Create account
          </Button>
        </form>
        <p className="auth-notice">
          Were you invited to an organization? Use the invitation link you
          received instead. Sign-up alone does not grant organization access.
        </p>
        <p>
          Already have an account? <Link to={paths.signIn}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
