import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { invokeFunction } from '../../lib/api';
import { isAuthConfigured } from '../../lib/config';
import { listMyMemberships, type Membership } from '../../lib/memberships';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Status = 'loading' | 'error' | 'member' | 'create' | 'submitting' | 'created';

export function OnboardingPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const hasAuth = isAuthConfigured && supabase !== null;

  const reload = useCallback(() => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    listMyMemberships(supabase)
      .then((rows) => {
        setMemberships(rows);
        setStatus(rows.length > 0 ? 'member' : 'create');
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (hasAuth) {
      reload();
    }
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Onboarding</h1>
          <div className="auth-notice" role="status">
            <p>
              Authentication is not configured for this environment. Set
              <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in a local{' '}
              <code>.env</code> file (see <code>.env.example</code>) to
              enable onboarding.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Onboarding</h1>
          <p role="status">Checking your organization memberships…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>Onboarding</h1>
          <ErrorState
            message="Your memberships could not be loaded. Check your connection and try again."
            onRetry={reload}
          />
        </div>
      </main>
    );
  }

  if (status === 'member' || status === 'created') {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <h1>You are set up</h1>
          <ul>
            {memberships.map((membership) => (
              <li key={membership.organization_id}>
                {membership.organization?.name ?? membership.organization_id} (
                {membership.role.replace(/_/g, ' ')})
              </li>
            ))}
          </ul>
          <p>
            Membership in an existing organization comes from an
            invitation or an administrator. To run a separate agency,
            create a new organization.
          </p>
          <Link to={paths.overview}>Go to overview</Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    if (name.trim().length === 0) {
      setError('Organization name is required.');
      return;
    }
    if (!slugPattern.test(slug)) {
      setError('Slug must use lowercase letters, numbers, and single hyphens.');
      return;
    }
    setStatus('submitting');
    setError(null);
    try {
      await invokeFunction<{ organization_id: string }>(
        supabase,
        'create-organization',
        { name, slug },
      );
      setMemberships([
        ...memberships,
        {
          organization_id: '',
          role: 'agency_admin',
          status: 'active',
          organization: { name, slug },
        },
      ]);
      setStatus('created');
    } catch (submitError) {
      setStatus('create');
      setError(submitError instanceof Error ? submitError.message : null);
    }
  }

  const slugInvalid = slugTouched && !slugPattern.test(slug);

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Create your organization</h1>
        <p>
          You do not belong to an organization yet. Create one to get
          started; you become its administrator. If you were invited to
          an existing organization, use the invitation link instead.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Organization name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            helper="For example: Samudra Stays."
            required
          />
          <Field
            label="Slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            onBlur={() => setSlugTouched(true)}
            helper="Lowercase letters, numbers, and single hyphens. Used in URLs."
            error={slugInvalid ? 'Slug must use lowercase letters, numbers, and single hyphens.' : undefined}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={status === 'submitting'}>
            Create organization
          </Button>
        </form>
      </div>
    </main>
  );
}
