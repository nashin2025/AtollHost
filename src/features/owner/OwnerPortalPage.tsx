import { createContext, useContext, type ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { SelectField } from '../../components/ui/Field';
import { getOwnerDashboard, listOwnerPropertyAccess } from '../../lib/ownerPortal';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface OwnerContextValue {
  allowedPropertyIds: string[];
  properties: OwnerPropertyView[];
  selectedId: string;
}

const OwnerContext = createContext<OwnerContextValue>({
  allowedPropertyIds: [],
  properties: [],
  selectedId: '',
});

export function useOwnerContext(): OwnerContextValue {
  return useContext(OwnerContext);
}

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
  link?: string;
}

function MetricCard({ title, value, context, icon, link }: MetricCard) {
  return (
    <a href={link} className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="stat-card-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
      <p className="stat-context">{context}</p>
    </a>
  );
}

const NAV_ITEMS: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Dashboard', path: paths.owner, icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon> },
  { label: 'Enquiries', path: paths.ownerEnquiries, icon: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon> },
  { label: 'Inbox', path: paths.ownerInbox, icon: <Icon><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Icon> },
  { label: 'Tasks', path: paths.ownerTasks, icon: <Icon><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></Icon> },
  { label: 'Reviews', path: paths.ownerReviews, icon: <Icon><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Icon> },
  { label: 'Content', path: paths.ownerContent, icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon> },
  { label: 'Reports', path: paths.ownerReports, icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon> },
];

function OwnerLayout() {
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

  async function handleSignOut() {
    if (!supabase) {
      return;
    }
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/sign-in', { replace: true });
  }

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

  if (properties.length === 0) {
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
        <EmptyState
          title="No properties shared with you yet"
          message="Your agency grants owner access from their workspace. Once they do, your property appears here."
        />
      </section>
    );
  }

  return (
    <OwnerContext.Provider
      value={{
        allowedPropertyIds: properties.map((p) => p.property_id),
        properties,
        selectedId,
      }}
    >
      <Outlet />
    </OwnerContext.Provider>
  );
}

export function OwnerWrapper() {
  return <OwnerLayout />;
}

export function OwnerPortalPage() {
  const { properties, selectedId } = useOwnerContext();
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

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
            link: paths.ownerEnquiries,
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
                link: paths.ownerReviews,
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
                link: paths.ownerTasks,
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
          selected.permissions.reports
            ? {
                title: 'Reports',
                value: 'Available',
                context: 'Run property-specific reports',
                icon: (
                  <Icon>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </Icon>
                ),
                link: paths.ownerReports,
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

      {properties.length > 1 && (
        <div className="field">
          <SelectField
            label="Property"
            value={selectedId}
            onChange={() => {}}
          >
            {properties.map((property) => (
              <option key={property.property_id} value={property.property_id}>
                {property.name}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <nav className="owner-nav" aria-label="Owner portal navigation" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

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
    </section>
  );
}

export { OwnerGuestPage } from './OwnerGuestPage';
export { OwnerGuestDetailPageWrapper } from './OwnerGuestDetailPage';
export { OwnerReservationPage } from './OwnerReservationPage';
export { OwnerReservationDetailPageWrapper } from './OwnerReservationDetailPage';
export { OwnerJourneyPage } from './OwnerJourneyPage';
export { OwnerBrainPage } from './OwnerBrainPage';
export { OwnerKnowledgeApprovalPage } from './OwnerKnowledgeApprovalPage';
export { OwnerPropertyPage } from './OwnerPropertyPage';
export { OwnerPropertySettingsPageWrapper } from './OwnerPropertySettingsPage';
export { OwnerIntegrationsPage } from './OwnerIntegrationsPage';
export { OwnerTeamPage } from './OwnerTeamPage';