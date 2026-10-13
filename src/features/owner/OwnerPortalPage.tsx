import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { SelectField } from '../../components/ui/Field';
import { getOwnerDashboard, listOwnerPropertyAccess } from '../../lib/ownerPortal';
import { supabase } from '../../lib/supabase';

interface OwnerPropertyView {
  property_id: string;
  name: string;
  dashboard: {
    revenue: { total: number; last_30d: number; currency: string };
    occupancy: { total_rooms: number; occupied_last_30d: number };
    enquiries: {
      total: number;
      open: number;
      won: number;
      conversion_rate: number;
    };
    reviews: { total: number; published: number; avg_rating: number | null };
    tasks: { total: number; completed: number; overdue: number };
    knowledge: { total_facts: number; approved: number };
  };
  permissions: Record<string, boolean>;
}

interface MetricCard {
  title: string;
  value: string;
  context: string;
  icon: ReactNode;
}

function MetricCard({ title, value, context, icon }: MetricCard) {
  return (
    <div className="stat-card">
      <span className="stat-card-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
      <p className="stat-context">{context}</p>
    </div>
  );
}

export function OwnerPortalPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<OwnerPropertyView[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus('error');
        return;
      }
      const grants = (
        await listOwnerPropertyAccess(supabase, userData.user.id)
      ).filter((row) => row.revoked_at === null);

      const views: OwnerPropertyView[] = [];
      for (const grant of grants) {
        try {
          const dashboard = await getOwnerDashboard(
            supabase,
            userData.user.id,
            grant.property_id,
          );
          views.push({
            property_id: grant.property_id,
            name: dashboard.property_name ?? grant.property_id,
            dashboard,
            permissions: {
              revenue: grant.can_view_revenue,
              occupancy: grant.can_view_occupancy,
              reviews: grant.can_view_reviews,
              tasks: grant.can_view_tasks,
              knowledge: grant.can_view_knowledge,
              reports: grant.can_view_reports,
            },
          });
        } catch {
          // A grant the dashboard call rejects is skipped rather than
          // rendered with partial data.
        }
      }
      setProperties(views);
      setSelectedId((current) => current || views[0]?.property_id || '');
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (hasAuth) {
      void reload();
    }
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="owner-heading">
        <h1 id="owner-heading">Owner portal</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to view your property dashboard."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="owner-heading">
        <h1 id="owner-heading">Owner portal</h1>
        <LoadingState label="Loading your properties" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="owner-heading">
        <h1 id="owner-heading">Owner portal</h1>
        <ErrorState
          message="Your dashboard could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const selected =
    properties.find((row) => row.property_id === selectedId) ?? null;

  async function handleSignOut() {
    if (!supabase) {
      return;
    }
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/sign-in', { replace: true });
  }

  const cards: (MetricCard | null)[] =
    selected === null
      ? []
      : [
          {
            title: 'Open enquiries',
            value: String(selected.dashboard.enquiries.open),
            context: `${selected.dashboard.enquiries.total} total · ${selected.dashboard.enquiries.conversion_rate}% won`,
            icon: (
              <Icon>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </Icon>
            ),
          },
          selected.permissions.revenue
            ? {
                title: 'Revenue',
                value: `${selected.dashboard.revenue.total.toLocaleString()} ${selected.dashboard.revenue.currency}`,
                context: `${selected.dashboard.revenue.last_30d.toLocaleString()} ${selected.dashboard.revenue.currency} in the last 30 days`,
                icon: (
                  <Icon>
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </Icon>
                ),
              }
            : null,
          selected.permissions.occupancy
            ? {
                title: 'Occupancy',
                value: `${selected.dashboard.occupancy.occupied_last_30d}`,
                context: `Nights occupied in the last 30 days · ${selected.dashboard.occupancy.total_rooms} rooms`,
                icon: (
                  <Icon>
                    <path d="M2 4v16" />
                    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                    <path d="M2 17h20" />
                    <path d="M6 8v9" />
                  </Icon>
                ),
              }
            : null,
          selected.permissions.reviews
            ? {
                title: 'Reviews',
                value:
                  selected.dashboard.reviews.avg_rating === null
                    ? '—'
                    : selected.dashboard.reviews.avg_rating.toFixed(1),
                context: `${selected.dashboard.reviews.published} published of ${selected.dashboard.reviews.total}`,
                icon: (
                  <Icon>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </Icon>
                ),
              }
            : null,
          selected.permissions.tasks
            ? {
                title: 'Tasks',
                value: `${selected.dashboard.tasks.completed}/${selected.dashboard.tasks.total}`,
                context: `${selected.dashboard.tasks.overdue} overdue`,
                icon: (
                  <Icon>
                    <path d="m3 17 2 2 4-4" />
                    <path d="m3 7 2 2 4-4" />
                    <path d="M13 6h8" />
                    <path d="M13 12h8" />
                    <path d="M13 18h8" />
                  </Icon>
                ),
              }
            : null,
          selected.permissions.knowledge
            ? {
                title: 'Verified facts',
                value: String(selected.dashboard.knowledge.approved),
                context: `${selected.dashboard.knowledge.total_facts} total facts on record`,
                icon: (
                  <Icon>
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </Icon>
                ),
              }
            : null,
        ];

  const visibleCards: MetricCard[] = cards.filter(
    (card): card is MetricCard => card !== null,
  );

  return (
    <section aria-labelledby="owner-heading">
      <div className="page-header">
        <div>
          <h1 id="owner-heading">Owner portal</h1>
          <p className="page-description">
            A read-only view of the properties you own, with only the metrics
            your agency has shared with you.
          </p>
        </div>
        <Button variant="secondary" loading={signingOut} onClick={() => void handleSignOut()}>
          Sign out
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties shared with you yet"
          message="Your agency grants owner access from their workspace. Once they do, your property appears here."
        />
      ) : (
        <>
          {properties.length > 1 && (
            <div className="field">
              <SelectField
                label="Property"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {properties.map((property) => (
                  <option key={property.property_id} value={property.property_id}>
                    {property.name}
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {selected && (
            <>
              <h2 className="overview-heading">{selected.name}</h2>
              <div className="stat-grid">
                {visibleCards.map((card) => (
                  <MetricCard key={card.title} {...card} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
