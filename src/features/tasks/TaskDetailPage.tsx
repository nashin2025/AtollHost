import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, EmptyState } from '../../components/ui/States';
import { getTask, type Task, listTaskComments, addTaskComment, type TaskComment, updateTask, type TaskUpdate } from '../../lib/tasks';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface Props {
  taskId: string;
}

export function TaskDetailPage({ taskId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const t = await getTask(supabase, taskId);
      setTask(t);
      if (t) {
        const cs = await listTaskComments(supabase, taskId);
        setComments(cs);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [taskId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  async function handleAddComment() {
    if (!supabase || !commentBody.trim()) return;
    setSending(true);
    try {
      await addTaskComment(supabase, taskId, commentBody.trim());
      setCommentBody('');
      const cs = await listTaskComments(supabase, taskId);
      setComments(cs);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!supabase || !task) return;
    try {
      const update: TaskUpdate = {
        task_id: taskId,
        property_id: task.property_id,
        assigned_to: task.assigned_to,
        title: task.title,
        description: task.description,
        status: newStatus,
        priority: task.priority,
        due_at: task.due_at,
      };
      await updateTask(supabase, update);
      const t = await getTask(supabase, taskId);
      setTask(t);
    } catch {
      console.error('Failed to update status');
    }
  }

  if (!hasAuth) {
    return (
      <section aria-labelledby="task-heading">
        <h1 id="task-heading">Task</h1>
        <EmptyState title="Authentication required" message="Sign in to view task details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="task-heading">
        <h1 id="task-heading">Task</h1>
        <LoadingState label="Loading task details" />
      </section>
    );
  }

  if (status === 'error' || !task) {
    return (
      <section aria-labelledby="task-heading">
        <h1 id="task-heading">Task</h1>
        <EmptyState title="Not found" message="Task could not be loaded." action={<Button variant="secondary" onClick={() => void reload()}>Retry</Button>} />
      </section>
    );
  }

  return (
    <section aria-labelledby="task-heading">
      <div className="page-header">
        <div>
          <h1 id="task-heading">{task.title}</h1>
          <p className="page-description">
            {task.property_id} · {task.source ?? 'Manual'}
            {' · '}
            <Badge status={task.status} tone={task.status === 'completed' ? 'success' : task.status === 'cancelled' ? 'danger' : task.status === 'in_progress' ? 'warning' : 'info'} />
            {' · '}
            <Badge status={task.priority} tone={task.priority === 'high' ? 'danger' : task.priority === 'urgent' ? 'danger' : 'info'} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.tasks}>
            <Button variant="outline">Back to tasks</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="task-sidebar">
          <div className="card">
            <h3>Description</h3>
            <p>{task.description ?? 'No description provided.'}</p>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Details</h3>
            <dl className="task-meta">
              <div>
                <dt>Assignee</dt>
                <dd>{task.assigned_to ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{task.due_at ? new Date(task.due_at).toLocaleString() : 'No due date'}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{task.source ?? 'Manual'}</dd>
              </div>
              <div>
                <dt>Comments</dt>
                <dd>{task.comments_count}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{task.last_activity_at ? new Date(task.last_activity_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{task.created_at ? new Date(task.created_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Status</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {(['pending', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
                <Button
                  key={s}
                  variant={task.status === s ? 'primary' : 'outline'}
                  onClick={() => void handleStatusChange(s)}
                  disabled={task.status === s || sending}
                >
                  {s.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <main className="task-main">
          <div className="card">
            <h2>Comments</h2>
            {comments.length === 0 ? (
              <EmptyState title="No comments" message="Add a comment to start the discussion." />
            ) : (
              <ul className="comment-list">
                {comments.map((c) => (
                  <li key={c.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{c.author_id}</span>
                      <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="comment-body">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="comment-form" style={{ marginTop: 'var(--space-4)' }}>
              <div className="field">
                <label htmlFor="comment-body">Add a comment</label>
                <textarea
                  id="comment-body"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Type your comment..."
                  style={{ minHeight: '80px', width: '100%' }}
                />
              </div>
              <div className="dialog-actions" style={{ marginTop: 'var(--space-3)' }}>
                <Button type="submit" loading={sending} onClick={() => void handleAddComment()}>
                  Add comment
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

export function TaskDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <TaskDetailPage taskId={id ?? ''} />;
}