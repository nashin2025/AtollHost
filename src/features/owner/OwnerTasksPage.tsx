import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { listTasks } from '../../lib/tasks';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';
import { useOwnerContext } from './OwnerPortalPage';

interface Task {
  id: string;
  property_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  source: string | null;
  comments_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  property?: { name: string };
}

export function OwnerTasksPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listTasks(supabase!, pid),
        ),
      );
      setTasks(results.flat());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setState('error');
    }
  }

  useEffect(() => {
    if (supabase && allowedPropertyIds.length > 0) {
      load();
    } else {
      setState('ready');
    }
  }, [supabase, allowedPropertyIds]);

  if (state === 'loading') {
    return <LoadingState label="Loading tasks…" />;
  }
  if (state === 'error') {
    return <ErrorState message={error ?? 'Unknown error'} onRetry={load} />;
  }

  function isOverdue(dueAt: string | null) {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  }

  return (
    <section aria-labelledby="page-heading">
      <header className="page-header">
        <h1 id="page-heading">Tasks</h1>
        <p className="page-description">
          Tasks assigned to your properties. Track progress, due dates, and priorities.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Assignee</th>
              <th scope="col">Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="state-empty">
                  No tasks found for your properties.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className={isOverdue(t.due_at) ? 'overdue' : ''}>
                  <td>
                    <Link to={`${paths.tasks}/${t.id}`} className="table-primary">
                      {t.title}
                    </Link>
                    {t.description && (
                      <p className="table-secondary">{t.description.slice(0, 80)}…</p>
                    )}
                  </td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                  <td>{t.assigned_to ?? '—'}</td>
                  <td>
                    {t.due_at
                      ? new Date(t.due_at).toLocaleDateString()
                      : '—'}
                    {isOverdue(t.due_at) && <span className="badge badge-danger">Overdue</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}