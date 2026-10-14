import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { listJourneyTemplates, type JourneyTemplate } from '../../lib/journeyTemplates';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerJourneyPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [templates, setTemplates] = useState<JourneyTemplate[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [orgId, setOrgId] = useState<string | null>(null);

  async function loadOrgId() {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .limit(1);
      if (memberships?.[0]) {
        setOrgId(memberships[0].organization_id);
      }
    }
  }

  async function loadTemplates() {
    if (!orgId) return;
    try {
      const ts = await listJourneyTemplates(supabase!, orgId);
      setTemplates(ts);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    loadOrgId().then(() => {
      if (orgId) loadTemplates();
      else setState('ready');
    });
  }, [supabase, allowedPropertyIds]);

  if (state === 'loading') {
    return <LoadingState label="Loading journey templates…" />;
  }
  if (allowedPropertyIds.length === 0) {
    return (
      <EmptyState
        title="No property access"
        message="You don't have access to any properties yet. Contact your agency administrator."
        action={<Button onClick={() => window.location.href = paths.owner}>Go to dashboard</Button>}
      />
    );
  }

  const triggerLabels = new Map([
    ['enquiry_created', 'Enquiry created'],
    ['booking_confirmed', 'Booking confirmed'],
    ['check_in_reminder', 'Before check-in'],
    ['check_out_followup', 'After check-out'],
    ['inactivity', 'Guest inactivity'],
  ]);

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Guest Journey</h1>
        <p className="page-description">
          Journey templates for your properties. View active and inactive touchpoints.
        </p>
      </header>

      {templates.length === 0 ? (
        <EmptyState
          title="No journey templates"
          message="No journey templates found for your properties."
        />
      ) : (
        <div className="property-grid">
          {templates.map((template) => (
            <article key={template.id} className="property-card">
              <header className="scan-card-header">
                <span className="scan-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="6" cy="19" r="3" />
                    <path d="M18 5a3 3 0 0 0-3 3v4a3 3 0 0 1-3 3H9" />
                    <path d="M6 16V9a3 3 0 0 1 3-3h3" />
                  </svg>
                </span>
                <div className="scan-card-title">
                  <h2>{template.name}</h2>
                  <p className="scan-card-url">
                    {triggerLabels.get(template.trigger_type) ?? template.trigger_type}
                  </p>
                </div>
                <Badge
                  status={template.is_active ? 'active' : 'inactive'}
                  tone={template.is_active ? 'success' : 'neutral'}
                />
              </header>
              {template.description && (
                <p className="stat-context">{template.description}</p>
              )}
              <footer className="scan-card-actions">
                <span className="table-secondary">
                  Created {new Date(template.created_at).toLocaleDateString()}
                </span>
                <Link to={`${paths.journeyDetail}/${template.id}`}>
                  <Button variant="outline">View details</Button>
                </Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}