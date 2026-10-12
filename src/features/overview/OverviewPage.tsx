import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';

interface StatCardProps {
  title: string;
  context: string;
}

function StatCard({ title, context }: StatCardProps) {
  return (
    <div className="stat-card">
      <h2>{title}</h2>
      <p className="stat-value" aria-label="No data yet">
        —
      </p>
      <p className="stat-context">{context}</p>
    </div>
  );
}

export function OverviewPage() {
  const stats: StatCardProps[] = [
    { title: 'Properties', context: 'No properties yet' },
    { title: 'Open enquiries', context: 'No enquiries yet' },
    { title: 'Unread conversations', context: 'No conversations yet' },
    { title: 'Overdue tasks', context: 'No tasks yet' },
    { title: 'Pending approvals', context: 'Nothing pending review' },
    { title: 'Integration health', context: 'No integrations configured' },
  ];

  return (
    <section aria-labelledby="overview-heading">
      <h1 id="overview-heading">Overview</h1>
      <p className="page-description">
        Assigned properties, open enquiries, unread conversations, overdue tasks,
        pending approvals, scanner findings, and integration health. Metrics
        appear here once data exists; a dash means there is nothing to report
        yet.
      </p>
      <div className="stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <EmptyState
        title="Nothing to show yet"
        message="Create your first property to populate this dashboard with live operational data."
        action={<Button>Create property</Button>}
      />
    </section>
  );
}
