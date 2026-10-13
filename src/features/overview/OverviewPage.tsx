import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import { loadOverviewStats, type OverviewStats } from '../../lib/overview';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Stat {
  title: string;
  count: number;
  context: string;
  icon: ReactNode;
}

function StatCard({ title, count, context, icon }: Stat) {
  return (
    <div className="stat-card">
      <span className="stat-card-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="stat-value">{count}</p>
      <p className="stat-context">{context}</p>
    </div>
  );
}

const gettingStartedSteps = [
  {
    title: 'Create your first property',
    detail: 'Names, rooms, policies, amenities, and photos in one place.',
    to: paths.properties,
  },
  {
    title: 'Scan your website for facts',
    detail: 'Pull public details into your Property Brain. Findings wait for your review.',
    to: paths.scanner,
  },
  {
    title: 'Track enquiries and replies',
    detail: 'Guest questions, from first message to approved response.',
    to: paths.enquiries,
  },
];

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

function statsFrom(stats: OverviewStats): Stat[] {
  const pendingApprovals = stats.pendingDrafts + stats.pendingFindings;
  const integrations = stats.connectedIntegrations + stats.erroringIntegrations;
  return [
    {
      title: 'Properties',
      count: stats.properties,
      context:
        stats.properties === 0 ? 'No properties yet' : 'Across your organizations',
      icon: (
        <Icon>
          <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
          <path d="M15 9h4a1 1 0 0 1 1 1v11" />
          <path d="M3 21h18" />
          <path d="M9 7h2" />
          <path d="M9 11h2" />
          <path d="M9 15h2" />
        </Icon>
      ),
    },
    {
      title: 'Open enquiries',
      count: stats.openEnquiries,
      context:
        stats.openEnquiries === 0 ? 'Nothing open' : 'New, open, and waiting',
      icon: (
        <Icon>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Icon>
      ),
    },
    {
      title: 'Unread enquiries',
      count: stats.unreadEnquiries,
      context:
        stats.unreadEnquiries === 0 ? 'All caught up' : 'Marked unread',
      icon: (
        <Icon>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </Icon>
      ),
    },
    {
      title: 'Overdue tasks',
      count: stats.overdueTasks,
      context:
        stats.overdueTasks === 0 ? 'Nothing overdue' : 'Past their due date',
      icon: (
        <Icon>
          <path d="m3 17 2 2 4-4" />
          <path d="m3 7 2 2 4-4" />
          <path d="M13 6h8" />
          <path d="M13 12h8" />
          <path d="M13 18h8" />
        </Icon>
      ),
    },
    {
      title: 'Pending approvals',
      count: pendingApprovals,
      context:
        pendingApprovals === 0
          ? 'Nothing pending review'
          : `${stats.pendingDrafts} AI ${plural(stats.pendingDrafts, 'draft', 'drafts')} · ${stats.pendingFindings} scan ${plural(stats.pendingFindings, 'finding', 'findings')}`,
      icon: (
        <Icon>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="m9 14 2 2 4-4" />
        </Icon>
      ),
    },
    {
      title: 'Integration health',
      count: stats.connectedIntegrations,
      context:
        integrations === 0
          ? 'No integrations configured'
          : stats.erroringIntegrations > 0
            ? `${stats.erroringIntegrations} ${plural(stats.erroringIntegrations, 'needs', 'need')} attention`
            : 'All connected',
      icon: (
        <Icon>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Icon>
      ),
    },
  ];
}

export function OverviewPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [stats, setStats] = useState<OverviewStats | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    try {
      setStats(await loadOverviewStats(supabase));
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
      <section aria-labelledby="overview-heading">
        <h1 id="overview-heading">Overview</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to see your overview."
        />
      </section>
    );
  }

  if (status === 'loading' || stats === null) {
    return (
      <section aria-labelledby="overview-heading">
        <h1 id="overview-heading">Overview</h1>
        <LoadingState label="Loading your overview" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="overview-heading">
        <h1 id="overview-heading">Overview</h1>
        <ErrorState
          message="Overview metrics could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const cards = statsFrom(stats);

  return (
    <section aria-labelledby="overview-heading">
      <h1 id="overview-heading">Overview</h1>
      <p className="page-description">
        Live metrics across your properties, enquiries, tasks, approvals, and
        integrations.
      </p>

      <h2 className="overview-heading">Metrics</h2>
      <div className="stat-grid">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {stats.properties === 0 && (
        <div className="overview-panel">
          <h2>Get started</h2>
          <p className="overview-panel-intro">
            Numbers appear here once data exists. Three steps to get moving:
          </p>
          <ul className="getting-started-list">
            {gettingStartedSteps.map((step) => (
              <li key={step.title}>
                <Link to={step.to} className="getting-started-link">
                  <span className="getting-started-body">
                    <strong>{step.title}</strong>
                    <span className="getting-started-detail">{step.detail}</span>
                  </span>
                  <Icon>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </Icon>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
