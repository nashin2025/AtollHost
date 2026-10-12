import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui/States';
import { ApiError, invokeFunction } from '../../lib/api';
import { isAuthConfigured } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

type Outcome =
  | 'checking'
  | 'missing-token'
  | 'needs-sign-in'
  | 'accepting'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'already-used'
  | 'wrong-email'
  | 'not-found'
  | 'error';

function mapError(error: unknown): Outcome {
  if (error instanceof ApiError) {
    if (error.code === 'NOT_FOUND') {
      return 'not-found';
    }
    if (error.code === 'FORBIDDEN') {
      return 'wrong-email';
    }
    if (error.code === 'CONFLICT') {
      const message = error.message.toLowerCase();
      if (message.includes('expired')) {
        return 'expired';
      }
      if (message.includes('revoked')) {
        return 'revoked';
      }
      if (message.includes('already used')) {
        return 'already-used';
      }
    }
  }
  return 'error';
}

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('token');
  const [outcome, setOutcome] = useState<Outcome>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptedRef = useRef(false);
  const hasAuth = isAuthConfigured && supabase !== null;

  useEffect(() => {
    if (!hasAuth) {
      return;
    }
    const client = supabase;
    if (!client) {
      return;
    }
    if (!token) {
      setOutcome('missing-token');
      return;
    }
    let cancelled = false;
    void client.auth.getSession().then(({ data }) => {
      if (cancelled) {
        return;
      }
      if (!data.session) {
        setOutcome('needs-sign-in');
        return;
      }
      if (attemptedRef.current) {
        return;
      }
      attemptedRef.current = true;
      setOutcome('accepting');
      invokeFunction<{ organization_id: string }>(client, 'accept-invitation', {
        token,
      })
        .then(() => {
          if (!cancelled) {
            setOutcome('accepted');
          }
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          setOutcome(mapError(error));
          setErrorMessage(error instanceof Error ? error.message : null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [hasAuth, token]);

  if (!hasAuth) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Invitation</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to
              enable invitation acceptance.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (outcome === 'checking' || outcome === 'accepting') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Invitation</h1>
          <LoadingState label="Verifying invitation" />
        </div>
      </main>
    );
  }

  if (outcome === 'missing-token') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Invitation link invalid</h1>
          <p role="alert">
            This invitation link is missing its token. Use the full link
            from the invitation email.
          </p>
        </div>
      </main>
    );
  }

  if (outcome === 'needs-sign-in') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Sign in to accept your invitation</h1>
          <p>
            This organization invitation requires an account. Sign in
            with the email address that received the invitation. If you
            do not have an account yet, create one first, then return to
            this link.
          </p>
          <Link
            to={paths.signIn}
            state={{ from: `${location.pathname}${location.search}` }}
          >
            Continue to sign in
          </Link>
        </div>
      </main>
    );
  }

  if (outcome === 'accepted') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Invitation accepted</h1>
          <p role="status">
            You are now a member of the organization. Welcome aboard.
          </p>
          <Link to={paths.overview}>Go to overview</Link>
        </div>
      </main>
    );
  }

  const titles: Record<Outcome, string> = {
    checking: 'Invitation',
    'missing-token': 'Invitation link invalid',
    'needs-sign-in': 'Invitation',
    accepting: 'Invitation',
    accepted: 'Invitation accepted',
    expired: 'Invitation expired',
    revoked: 'Invitation revoked',
    'already-used': 'Invitation already used',
    'wrong-email': 'Wrong email address',
    'not-found': 'Invitation not found',
    error: 'Invitation failed',
  };

  const messages: Partial<Record<Outcome, string>> = {
    expired:
      'This invitation expired. Ask the organization administrator to send a new invitation.',
    revoked:
      'This invitation was revoked. Ask the organization administrator for a new invitation.',
    'already-used':
      'This invitation has already been accepted. Sign in to access your organization.',
    'wrong-email':
      'This invitation was sent to a different email address. Sign in with the email address that received the invitation, or ask the administrator to re-send it.',
    'not-found':
      'This invitation does not exist. Check that you used the full link from the invitation email.',
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>{titles[outcome]}</h1>
        <p role="alert">
          {messages[outcome] ??
            'The invitation could not be accepted. Try again later or contact the organization administrator.'}
        </p>
        {errorMessage && outcome === 'error' && (
          <p className="auth-notice">{errorMessage}</p>
        )}
        <Link to={paths.signIn}>Back to sign in</Link>
      </div>
    </main>
  );
}
