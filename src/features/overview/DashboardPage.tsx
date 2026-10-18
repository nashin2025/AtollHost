import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { Skeleton } from '../../components/ui/Skeleton';
import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { loadOverviewStats, type OverviewStats } from '../../lib/overview';
import {
  loadUnansweredEnquiries,
  type UnansweredEnquiry,
} from '../../lib/overview';
import {
  loadPendingApprovals,
  type PendingApproval,
} from '../../lib/overview';
import {
  loadOverdueTasks,
  type OverdueTask,
} from '../../lib/overview';
import {
  loadRecentActivity,
  type ActivityItem,
} from '../../lib/overview';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

interface StatCardProps {
  title: string;
  count: number;
  context: string;
  icon: ReactNode;
  trend?: { value: number; label: string; positive: boolean };
  href?: string;
}

function StatCard({
  title,
  count,
  context,
  icon,
  trend,
  href,
}: StatCardProps) {
  const content = (
    <>
      <div className="af-stat-card__icon">{icon}</div>
      <div className="af-stat-card__content">
        <h3 className="af-stat-card__title">{title}</h3>
        <p className="af-stat-card__value">{count}</p>
        <p className="af-stat-card__context">{context}</p>
        {trend && (
          <p className={`af-stat-card__trend ${trend.positive ? 'positive' : 'negative'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}% {trend.label}
          </p>
        )}
      </div>
    </>
  );

  if (!href) {
    return (
      <Card className="af-stat-card">
        <div className="af-stat-card__body">{content}</div>
      </Card>
    );
  }
  return (
    <Link to={href} className="af-stat-card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card className="af-stat-card">
        <div className="af-stat-card__body">{content}</div>
      </Card>
    </Link>
  );
}

function UnansweredEnquiryCard({ enquiry }: { enquiry: UnansweredEnquiry }) {
  return (
    <Link to={`${paths.enquiryDetail}/${enquiry.id}`} className="af-link-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="af-link-card__icon enquiry">
        <Icon>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Icon>
      </div>
      <div className="af-link-card__content">
        <p className="af-link-card__title">{enquiry.subject ?? 'Untitled enquiry'}</p>
        <p className="af-link-card__meta">
          <span className="af-link-card__property">{enquiry.property_name}</span>
          <span className="af-link-card__channel">{enquiry.channel.replace(/_/g, ' ')}</span>
        </p>
        <p className="af-link-card__time">{new Date(enquiry.created_at).toLocaleString()}</p>
      </div>
      <Badge status="unread" tone="info" />
    </Link>
  );
}

function PendingApprovalCard({ approval }: { approval: PendingApproval }) {
  const isDraft = approval.type === 'ai_draft';
  return (
    <Link to={isDraft ? `${paths.brainEditor}/${approval.id}` : `${paths.scanner}/${approval.id}/findings`} className="af-link-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className={`af-link-card__icon ${isDraft ? 'ai-draft' : 'scan-finding'}`}>
        <Icon>
          {isDraft ? (
            <>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="m9 14 2 2 4-4" />
            </>
          ) : (
            <>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6" />
              <path d="M16 8H8" />
              <path d="M16 12H8" />
              <path d="M16 16H8" />
            </>
          )}
        </Icon>
      </div>
      <div className="af-link-card__content">
        <p className="af-link-card__title">{isDraft ? 'AI draft ready for review' : 'Scan finding pending review'}</p>
        <p className="af-link-card__meta">
          <span className="af-link-card__property">{approval.property_name}</span>
          {isDraft && <span className="af-link-card__confidence">{Math.round(approval.confidence * 100)}% confidence</span>}
        </p>
        <p className="af-link-card__time">{new Date(approval.created_at).toLocaleString()}</p>
      </div>
      <Badge status={isDraft ? 'draft' : 'pending'} tone={isDraft ? 'warning' : 'info'} />
    </Link>
  );
}

function OverdueTaskCard({ task }: { task: OverdueTask }) {
  return (
    <Link to={`${paths.taskDetail}/${task.id}`} className="af-link-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="af-link-card__icon task">
        <Icon>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
        </Icon>
      </div>
      <div className="af-link-card__content">
        <p className="af-link-card__title">{task.title}</p>
        <p className="af-link-card__meta">
          <span className="af-link-card__property">{task.property_name}</span>
          <span className={`af-link-card__priority priority-${task.priority}`}>{task.priority}</span>
        </p>
        <p className="af-link-card__time">Due {new Date(task.due_at).toLocaleDateString()}</p>
      </div>
      <Badge status={task.priority} tone={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'info'} />
    </Link>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'enquiry':
        return (
          <>
            <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>
            <Icon><path d="M22 12h-6l-2 3h-4l-2-3H2" /></Icon>
          </>
        );
      case 'message':
        return (
          <>
            <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>
            <Icon><path d="M22 12h-6l-2 3h-4l-2-3H2" /></Icon>
          </>
        );
      case 'task':
        return (
          <>
            <Icon><path d="M9 11l3 3L22 4" /></Icon>
            <Icon><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" /></Icon>
          </>
        );
      case 'approval':
        return (
          <>
            <Icon><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="m9 14 2 2 4-4" /></Icon>
          </>
        );
      case 'scan':
        return (
          <>
            <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6" /><path d="M16 8H8" /><path d="M16 12H8" /><path d="M16 16H8" /></Icon>
          </>
        );
      default:
        return <Icon><circle cx="12" cy="12" r="10" /></Icon>;
    }
  };

  const getTone = () => {
    switch (activity.type) {
      case 'enquiry': return 'info';
      case 'message': return 'success';
      case 'task': return 'warning';
      case 'approval': return 'warning';
      case 'scan': return 'info';
      default: return 'neutral';
    }
  };

  return (
    <div className="af-link-card">
      <div className={`af-link-card__icon ${activity.type}`}>
        {getIcon()}
      </div>
      <div className="af-link-card__content">
        <p className="af-link-card__title">{activity.title}</p>
        <p className="af-link-card__meta">
          <span className="af-link-card__property">{activity.property_name}</span>
          {activity.meta && <span className="af-link-card__meta-extra">{activity.meta}</span>}
        </p>
        <p className="af-link-card__time">{new Date(activity.created_at).toLocaleString()}</p>
      </div>
      <Badge status={activity.type} tone={getTone()} />
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <Card className="af-skeleton-card">
      <div className="af-skeleton-card__body">
        <div className="af-stat-card__icon">
          <Skeleton variant="circular" className="stat-card-icon" />
        </div>
        <div className="af-stat-card__content">
          <Skeleton variant="text" lines={1} style={{ width: '60%' }} />
          <Skeleton variant="text" lines={1} style={{ width: '40%' }} />
          <Skeleton variant="text" lines={1} style={{ width: '80%' }} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonActivityCard() {
  return (
    <div className="af-skeleton-card">
      <div className="af-stat-card__icon">
        <Skeleton variant="circular" className="activity-icon" />
      </div>
      <div className="af-stat-card__content">
        <Skeleton variant="text" lines={1} style={{ width: '70%' }} />
        <Skeleton variant="text" lines={1} style={{ width: '50%' }} />
        <Skeleton variant="text" lines={1} style={{ width: '40%' }} />
      </div>
      <Skeleton variant="rectangular" style={{ width: '80px', height: '24px' }} />
    </div>
  );
}

export function DashboardPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [unansweredEnquiries, setUnansweredEnquiries] = useState<UnansweredEnquiry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    setError(null);
    try {
      const [statsData, unansweredData, approvalsData, tasksData, activityData] = await Promise.all([
        loadOverviewStats(supabase),
        loadUnansweredEnquiries(supabase),
        loadPendingApprovals(supabase),
        loadOverdueTasks(supabase),
        loadRecentActivity(supabase),
      ]);
      setStats(statsData);
      setUnansweredEnquiries(unansweredData);
      setPendingApprovals(approvalsData);
      setOverdueTasks(tasksData);
      setRecentActivity(activityData);
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Failed to load dashboard data. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (hasAuth) {
      void reload();
    }
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section className="af-page" aria-labelledby="dashboard-heading">
        <header className="af-page-header">
          <h1 id="dashboard-heading">Dashboard</h1>
        </header>
        <div className="af-page-body">
          <EmptyState title="Authentication required" message="Sign in to view your operational dashboard." />
        </div>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section className="af-page" aria-labelledby="dashboard-heading">
        <header className="af-page-header">
          <h1 id="dashboard-heading">Dashboard</h1>
        </header>
        <div className="af-page-body">
          <div className="af-stat-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="af-dashboard-grid">
            <section className="af-card af-card--body">
              <header className="af-card__header">
                <Skeleton variant="text" lines={1} style={{ width: '30%' }} />
                <Skeleton variant="text" lines={1} style={{ width: '20%' }} />
              </header>
              <div className="af-card__body">
                {[1, 2, 3].map((i) => <SkeletonActivityCard key={i} />)}
              </div>
            </section>
            <section className="af-card af-card--body">
              <header className="af-card__header">
                <Skeleton variant="text" lines={1} style={{ width: '30%' }} />
                <Skeleton variant="text" lines={1} style={{ width: '20%' }} />
              </header>
              <div className="af-card__body">
                {[1, 2, 3].map((i) => <SkeletonActivityCard key={i} />)}
              </div>
            </section>
            <section className="af-card af-card--body">
              <header className="af-card__header">
                <Skeleton variant="text" lines={1} style={{ width: '30%' }} />
                <Skeleton variant="text" lines={1} style={{ width: '20%' }} />
              </header>
              <div className="af-card__body">
                {[1, 2, 3].map((i) => <SkeletonActivityCard key={i} />)}
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="af-page" aria-labelledby="dashboard-heading">
        <header className="af-page-header">
          <h1 id="dashboard-heading">Dashboard</h1>
        </header>
        <div className="af-page-body">
          <ErrorState message={error ?? 'Dashboard could not be loaded. Check your connection and try again.'} onRetry={() => void reload()} />
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="af-page" aria-labelledby="dashboard-heading">
        <header className="af-page-header">
          <h1 id="dashboard-heading">Dashboard</h1>
        </header>
        <div className="af-page-body">
          <EmptyState title="No data available" message="Unable to load dashboard metrics." />
        </div>
      </section>
    );
  }

  const pendingApprovalsCount = stats.pendingDrafts + stats.pendingFindings;
  const integrationsTotal = stats.connectedIntegrations + stats.erroringIntegrations;

  const statsCards: StatCardProps[] = [
    {
      title: 'Properties',
      count: stats.properties,
      context: stats.properties === 0 ? 'No properties yet' : 'Across your organizations',
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
      href: paths.properties,
    },
    {
      title: 'Open enquiries',
      count: stats.openEnquiries,
      context: stats.openEnquiries === 0 ? 'Nothing open' : 'New, open, and waiting',
      icon: (
        <Icon>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Icon>
      ),
      href: paths.enquiries,
    },
    {
      title: 'Unread enquiries',
      count: stats.unreadEnquiries,
      context: stats.unreadEnquiries === 0 ? 'All caught up' : 'Marked unread',
      icon: (
        <Icon>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </Icon>
      ),
      href: paths.enquiries,
    },
    {
      title: 'Overdue tasks',
      count: stats.overdueTasks,
      context: stats.overdueTasks === 0 ? 'Nothing overdue' : 'Past their due date',
      icon: (
        <Icon>
          <path d="m3 17 2 2 4-4" />
          <path d="m3 7 2 2 4-4" />
          <path d="M13 6h8" />
          <path d="M13 12h8" />
          <path d="M13 18h8" />
        </Icon>
      ),
      href: paths.tasks,
    },
    {
      title: 'Pending approvals',
      count: pendingApprovalsCount,
      context:
        pendingApprovalsCount === 0
          ? 'Nothing pending review'
          : `${stats.pendingDrafts} AI ${plural(stats.pendingDrafts, 'draft', 'drafts')} · ${stats.pendingFindings} scan ${plural(stats.pendingFindings, 'finding', 'findings')}`,
      icon: (
        <Icon>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="m9 14 2 2 4-4" />
        </Icon>
      ),
      href: paths.brainEditor,
    },
    {
      title: 'Integration health',
      count: stats.connectedIntegrations,
      context:
        integrationsTotal === 0
          ? 'No integrations configured'
          : stats.erroringIntegrations > 0
            ? `${stats.erroringIntegrations} ${plural(stats.erroringIntegrations, 'needs', 'need')} attention`
            : 'All connected',
      icon: (
        <Icon>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Icon>
      ),
      href: paths.integrations,
    },
  ];

  return (
    <section className="af-page" aria-labelledby="dashboard-heading">
      <header className="af-page-header">
        <div>
          <h1 id="dashboard-heading">Dashboard</h1>
          <p className="af-page-description">
            Operational metrics across your properties, enquiries, tasks, approvals, and integrations.
          </p>
        </div>
        <Button onClick={reload} variant="outline">
          Refresh
        </Button>
      </header>

      <div className="af-page-body">
        <h2 className="af-section-title">Metrics</h2>
        <div className="af-stat-grid" role="list">
          {statsCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        <div className="af-dashboard-grid">
          <section className="af-card" aria-labelledby="unanswered-heading">
            <header className="af-card__header">
              <h2 id="unanswered-heading" className="af-card__title">Unanswered enquiries</h2>
              {unansweredEnquiries.length > 0 && (
                <Link to={paths.enquiries} className="af-section-link">
                  View all
                </Link>
              )}
            </header>
            <div className="af-card__body">
              <div className="af-link-list">
                {unansweredEnquiries.length === 0 ? (
                  <EmptyState title="No unanswered enquiries" message="All enquiries have been responded to." />
                ) : (
                  unansweredEnquiries.slice(0, 5).map((enquiry) => (
                    <UnansweredEnquiryCard key={enquiry.id} enquiry={enquiry} />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="af-card" aria-labelledby="approvals-heading">
            <header className="af-card__header">
              <h2 id="approvals-heading" className="af-card__title">Pending approvals</h2>
              {pendingApprovals.length > 0 && (
                <Link to={paths.brainEditor} className="af-section-link">
                  View all
                </Link>
              )}
            </header>
            <div className="af-card__body">
              <div className="af-link-list">
                {pendingApprovals.length === 0 ? (
                  <EmptyState title="No pending approvals" message="All AI drafts and scan findings have been reviewed." />
                ) : (
                  pendingApprovals.slice(0, 5).map((approval) => (
                    <PendingApprovalCard key={approval.id} approval={approval} />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="af-card" aria-labelledby="overdue-heading">
            <header className="af-card__header">
              <h2 id="overdue-heading" className="af-card__title">Overdue tasks</h2>
              {overdueTasks.length > 0 && (
                <Link to={paths.tasks} className="af-section-link">
                  View all
                </Link>
              )}
            </header>
            <div className="af-card__body">
              <div className="af-link-list">
                {overdueTasks.length === 0 ? (
                  <EmptyState title="No overdue tasks" message="All tasks are on schedule." />
                ) : (
                  overdueTasks.slice(0, 5).map((task) => (
                    <OverdueTaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="af-card" aria-labelledby="activity-heading">
            <header className="af-card__header">
              <h2 id="activity-heading" className="af-card__title">Recent activity</h2>
              <Link to={paths.overview} className="af-section-link">
                View all
              </Link>
            </header>
            <div className="af-card__body">
              <div className="af-link-list">
                {recentActivity.length === 0 ? (
                  <EmptyState title="No recent activity" message="Activity will appear here as your team works." />
                ) : (
                  recentActivity.slice(0, 10).map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {stats.properties === 0 && (
          <section className="af-card">
            <div className="af-card__body">
              <h2 className="af-section-title">Get started</h2>
              <p className="af-page-description">
                Numbers appear here once data exists. Three steps to get moving:
              </p>
              <ul className="af-getting-started-list">
                <li>
                  <Link to={paths.properties} className="af-getting-started-link">
                    <span className="af-getting-started-body">
                      <strong>Create your first property</strong>
                      <span className="af-getting-started-detail">Names, rooms, policies, amenities, and photos in one place.</span>
                    </span>
                    <Icon>
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </Icon>
                  </Link>
                </li>
                <li>
                  <Link to={paths.scanner} className="af-getting-started-link">
                    <span className="af-getting-started-body">
                      <strong>Scan your website for facts</strong>
                      <span className="af-getting-started-detail">Pull public details into your Property Brain. Findings wait for your review.</span>
                    </span>
                    <Icon>
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </Icon>
                  </Link>
                </li>
                <li>
                  <Link to={paths.enquiries} className="af-getting-started-link">
                    <span className="af-getting-started-body">
                      <strong>Track enquiries and replies</strong>
                      <span className="af-getting-started-detail">Guest questions, from first message to approved response.</span>
                    </span>
                    <Icon>
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </Icon>
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
