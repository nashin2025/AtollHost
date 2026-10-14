import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { ErrorState, LoadingState, EmptyState } from '../../components/ui/States';
import { TabList, Tab, TabPanel, TabPanels } from '../../components/ui/Tabs';
import { listPropertyTeam, type Property, type TeamMember } from '../../lib/properties';
import { listEnquiries, type Enquiry } from '../../lib/enquiries';
import { listTasks, type Task } from '../../lib/tasks';
import { listKnowledgeItems, type KnowledgeItem } from '../../lib/knowledge';
import { listIntegrations, type Integration } from '../../lib/integrations';
import { supabase } from '../../lib/supabase';

function statusTone(status: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'archived') return 'neutral';
  return 'info';
}

interface Props {
  propertyId: string;
}

export function PropertyDetailPage({ propertyId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [property, setProperty] = useState<Property | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const [prop, teamData, enquiriesData, tasksData, knowledgeData, integrationsData] = await Promise.all([
        supabase.from('properties').select('*').eq('id', propertyId).single().then(r => r.data),
        listPropertyTeam(supabase, propertyId),
        listEnquiries(supabase, propertyId),
        listTasks(supabase, propertyId),
        listKnowledgeItems(supabase, propertyId),
        listIntegrations(supabase, propertyId),
      ]);
      setProperty(prop);
      setTeam(teamData);
      setEnquiries(enquiriesData);
      setTasks(tasksData);
      setKnowledge(knowledgeData);
      setIntegrations(integrationsData);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [propertyId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="property-heading">
        <h1 id="property-heading">Property</h1>
        <EmptyState title="Authentication required" message="Sign in to view property details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="property-heading">
        <h1 id="property-heading">Property</h1>
        <LoadingState label="Loading property details" />
      </section>
    );
  }

  if (status === 'error' || !property) {
    return (
      <section aria-labelledby="property-heading">
        <h1 id="property-heading">Property</h1>
        <ErrorState message="Property could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  const tabs = [
    { label: 'Overview', icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon> },
    { label: 'Team', icon: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon> },
    { label: 'Knowledge', icon: <Icon><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></Icon> },
    { label: 'Tasks', icon: <Icon><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></Icon> },
    { label: 'Enquiries', icon: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon> },
    { label: 'Integrations', icon: <Icon><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon> },
  ];

  return (
    <section aria-labelledby="property-heading">
      <div className="page-header">
        <div>
          <h1 id="property-heading">{property.name}</h1>
          <p className="page-description">
            {property.island}{property.atoll ? `, ${property.atoll}` : ''}
            {' · '}
            <Badge status={property.status} tone={statusTone(property.status)} />
          </p>
        </div>
      </div>

      <TabList aria-label="Property detail sections" onChange={() => {}} selectedIndex={0}>
        {tabs.map((tab, index) => (
          <Tab key={tab.label} index={index}>
            {tab.icon}
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <TabPanels selectedIndex={0}>
        <TabPanel index={0}>
          <div className="property-overview">
            <dl className="property-meta">
              <div>
                <dt>Organization</dt>
                <dd>{property.organization?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Island</dt>
                <dd>{property.island}</dd>
              </div>
              <div>
                <dt>Atoll</dt>
                <dd>{property.atoll ?? '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{property.phone ?? '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{property.email ?? '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{property.address ?? '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><Badge status={property.status} tone={statusTone(property.status)} /></dd>
              </div>
            </dl>

            <div className="overview-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
              <div className="stat-card">
                <h3>Team members</h3>
                <p className="stat-value">{team.length}</p>
              </div>
              <div className="stat-card">
                <h3>Open enquiries</h3>
                <p className="stat-value">{enquiries.filter(e => e.status === 'open' || e.status === 'new' || e.status === 'contacted').length}</p>
              </div>
              <div className="stat-card">
                <h3>Active tasks</h3>
                <p className="stat-value">{tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length}</p>
              </div>
              <div className="stat-card">
                <h3>Knowledge items</h3>
                <p className="stat-value">{knowledge.length}</p>
              </div>
              <div className="stat-card">
                <h3>Integrations</h3>
                <p className="stat-value">{integrations.length}</p>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel index={1}>
          <div className="team-section">
            <h2>Team members</h2>
            {team.length === 0 ? (
              <EmptyState title="No team members" message="Assign team members from the Properties list." />
            ) : (
              <ul className="team-list">
                {team.map((member) => (
                  <li key={member.user_id} className="team-list-item">
                    <div>
                      <p className="table-primary">{member.full_name ?? member.user_id}</p>
                      <p className="table-secondary">{member.role.replace(/_/g, ' ')} ({member.status})</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>

        <TabPanel index={2}>
          <div className="knowledge-section">
            <h2>Knowledge items</h2>
            {knowledge.length === 0 ? (
              <EmptyState title="No knowledge items" message="Add facts from the Property Brain knowledge editor." />
            ) : (
              <ul className="findings-list">
                {knowledge.map((item) => (
                  <li key={item.id} className="finding-card">
                    <div className="finding-header">
                      <p className="finding-title">{item.title}</p>
                      <Badge status={item.status.replace(/_/g, ' ')} tone="info" />
                    </div>
                    <p>{item.content.slice(0, 200)}...</p>
                    <p className="finding-category">
                      {item.category_id ? `Category: ${item.category_id}` : 'Uncategorized'} · v{item.version} · {item.source ?? 'no source'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>

        <TabPanel index={3}>
          <div className="tasks-section">
            <h2>Tasks</h2>
            {tasks.length === 0 ? (
              <EmptyState title="No tasks" message="Create tasks from the Tasks page." />
            ) : (
              <ul className="findings-list">
                {tasks.map((task) => (
                  <li key={task.id} className="finding-card">
                    <div className="finding-header">
                      <p className="finding-title">{task.title}</p>
                      <Badge status={task.status} tone={task.status === 'completed' ? 'success' : task.status === 'cancelled' ? 'neutral' : 'info'} />
                    </div>
                    <p className="finding-category">
                      Priority: {task.priority} · {task.due_at ? `Due: ${new Date(task.due_at).toLocaleDateString()}` : 'No due date'}
                    </p>
                    {task.description && <p>{task.description.slice(0, 200)}...</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>

        <TabPanel index={4}>
          <div className="enquiries-section">
            <h2>Enquiries</h2>
            {enquiries.length === 0 ? (
              <EmptyState title="No enquiries" message="Enquiries will appear here as they arrive." />
            ) : (
              <ul className="findings-list">
                {enquiries.map((enquiry) => (
                  <li key={enquiry.id} className="finding-card">
                    <div className="finding-header">
                      <p className="finding-title">{enquiry.subject ?? enquiry.topic ?? 'Enquiry'}</p>
                      <Badge status={enquiry.status} tone={enquiry.status === 'won' ? 'success' : enquiry.status === 'lost' ? 'danger' : 'info'} />
                    </div>
                    <p className="finding-category">
                      Channel: {enquiry.channel} · {enquiry.created_at ? new Date(enquiry.created_at).toLocaleDateString() : ''}
                    </p>
                    {enquiry.follow_up_at && <p className="finding-category">Follow-up: {new Date(enquiry.follow_up_at).toLocaleDateString()}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>

        <TabPanel index={5}>
          <div className="integrations-section">
            <h2>Integrations</h2>
            {integrations.length === 0 ? (
              <EmptyState title="No integrations" message="Configure integrations from the Integrations page." />
            ) : (
              <ul className="team-list">
                {integrations.map((integration) => (
                  <li key={integration.id} className="team-list-item">
                    <div>
                      <p className="table-primary">{integration.provider}</p>
                      <p className="table-secondary">{integration.status} · {integration.last_health_check ? `Last check: ${new Date(integration.last_health_check).toLocaleString()}` : 'Never checked'}</p>
                    </div>
                    <Badge
                      status={integration.status === 'connected' ? 'connected' : integration.status === 'error' ? 'error' : 'pending'}
                      tone={integration.status === 'connected' ? 'success' : integration.status === 'error' ? 'danger' : 'warning'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabPanel>
      </TabPanels>
    </section>
  );
}