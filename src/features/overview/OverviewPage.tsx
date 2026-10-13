import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { paths } from '../../router';

interface Stat {
  title: string;
  context: string;
  icon: ReactNode;
}

function StatCard({ title, context, icon }: Stat) {
  return (
    <div className="stat-card">
      <span className="stat-card-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="stat-value" aria-hidden="true">
        &mdash;
      </p>
      <p className="stat-context">{context}</p>
    </div>
  );
}

const stats: Stat[] = [
  {
    title: 'Properties',
    context: 'No properties yet',
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
    context: 'No enquiries yet',
    icon: (
      <Icon>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </Icon>
    ),
  },
  {
    title: 'Unread conversations',
    context: 'No conversations yet',
    icon: (
      <Icon>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </Icon>
    ),
  },
  {
    title: 'Overdue tasks',
    context: 'No tasks yet',
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
    context: 'Nothing pending review',
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
    context: 'No integrations configured',
    icon: (
      <Icon>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </Icon>
    ),
  },
];

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

export function OverviewPage() {
  return (
    <section aria-labelledby="overview-heading">
      <h1 id="overview-heading">Overview</h1>
      <p className="page-description">
        Live metrics across your properties, enquiries, conversations, tasks,
        approvals, and integrations.
      </p>

      <h2 className="overview-heading">Metrics</h2>
      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

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
    </section>
  );
}
