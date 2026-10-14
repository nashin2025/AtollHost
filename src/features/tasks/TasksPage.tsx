import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { listMyMemberships } from '../../lib/memberships';
import {
  listOrganizationMembers,
  listProperties,
  type OrganizationMember,
  type Property,
} from '../../lib/properties';
import {
  createTask,
  listTasks,
  updateTask,
  type Task,
} from '../../lib/tasks';
import { supabase } from '../../lib/supabase';

const taskStatuses = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const taskPriorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusTone: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  todo: 'neutral',
  in_progress: 'info',
  blocked: 'warning',
  done: 'success',
  cancelled: 'neutral',
};

const priorityTone: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
};

interface TaskFormState {
  taskId: string | null;
  propertyId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string;
  assignedTo: string;
}

const emptyForm: TaskFormState = {
  taskId: null,
  propertyId: '',
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  dueAt: '',
  assignedTo: '',
};

function toFormState(task: Task): TaskFormState {
  return {
    taskId: task.id,
    propertyId: task.property_id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '',
    assignedTo: task.assigned_to ?? '',
  };
}

function isOverdue(task: Task, now: number): boolean {
  if (task.due_at === null || task.status === 'done' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.due_at).getTime() < now;
}

function dueLabel(dueAt: string | null): string {
  if (dueAt === null) {
    return '—';
  }
  return new Date(dueAt).toLocaleString();
}

function assigneeLabel(
  assignedTo: string | null,
  members: OrganizationMember[],
): string {
  if (assignedTo === null) {
    return 'Unassigned';
  }
  const member = members.find((row) => row.user_id === assignedTo);
  if (!member) {
    return assignedTo.length > 13 ? `${assignedTo.slice(0, 8)}…${assignedTo.slice(-4)}` : assignedTo;
  }
  return member.full_name ?? member.email;
}

export function TasksPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<Property[]>([]);
  const [memberships, setMemberships] = useState<{ organization_id: string; role: string }[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dialog, setDialog] = useState<'none' | 'create' | 'edit'>('none');
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [propertyRows, membershipRows] = await Promise.all([
        listProperties(supabase),
        listMyMemberships(supabase),
      ]);
      setProperties(propertyRows);
      setMemberships(membershipRows);
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

  useEffect(() => {
    if (status === 'ready' && selectedPropertyId === '' && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [status, selectedPropertyId, properties]);

  const reloadTasks = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setTasks([]);
      setMembers([]);
      return;
    }
    const property = properties.find((row) => row.id === selectedPropertyId);
    if (property) {
      try {
        setMembers(await listOrganizationMembers(supabase, property.organization_id));
      } catch {
        setMembers([]);
      }
    } else {
      setMembers([]);
    }
    try {
      setTasks(await listTasks(supabase, selectedPropertyId));
    } catch {
      setTasks([]);
    }
  }, [selectedPropertyId, properties]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadTasks();
  }, [status, selectedPropertyId, reloadTasks]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="tasks-heading">
        <h1 id="tasks-heading">Tasks</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage tasks."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="tasks-heading">
        <h1 id="tasks-heading">Tasks</h1>
        <LoadingState label="Loading tasks" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="tasks-heading">
        <h1 id="tasks-heading">Tasks</h1>
        <ErrorState
          message="Tasks could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const now = Date.now();
  const manageableOrgIds = new Set(
    memberships
      .filter((membership) => membership.role === 'agency_admin')
      .map((membership) => membership.organization_id),
  );
  const canManage =
    selectedPropertyId !== '' &&
    manageableOrgIds.has(
      properties.find((row) => row.id === selectedPropertyId)?.organization_id ?? '',
    );

  const visibleTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (overdueOnly && !isOverdue(task, now)) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const haystack = [task.title, task.description, task.source]
        .filter((value): value is string => value !== null)
        .map((value) => value.toLowerCase())
        .join(' ');
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
  const overdueCount = tasks.filter((task) => isOverdue(task, now)).length;
  const openCount = tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'cancelled',
  ).length;

  function openCreate() {
    setForm({ ...emptyForm, propertyId: selectedPropertyId });
    setError(null);
    setDialog('create');
  }

  function openEdit(task: Task) {
    setForm(toFormState(task));
    setError(null);
    setDialog('edit');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      property_id: form.propertyId,
      title: form.title,
      description: form.description.trim().length > 0 ? form.description : null,
      status: form.status,
      priority: form.priority,
      due_at: form.dueAt === '' ? null : new Date(form.dueAt).toISOString(),
      assigned_to: form.assignedTo === '' ? null : form.assignedTo,
      source: null,
    };
    try {
      if (form.taskId === null) {
        await createTask(supabase, payload);
      } else {
        await updateTask(supabase, {
          task_id: form.taskId,
          property_id: form.propertyId,
          title: payload.title,
          description: payload.description,
          status: payload.status,
          priority: payload.priority,
          due_at: payload.due_at,
          assigned_to: payload.assigned_to,
        });
      }
      setDialog('none');
      await reloadTasks();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(task: Task) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateTask(supabase, {
        task_id: task.id,
        property_id: task.property_id,
        assigned_to: null,
        title: null,
        description: null,
        status: 'done',
        priority: null,
        due_at: null,
      });
      await reloadTasks();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      sortValue: (row) => row.title,
      render: (row) => (
        <div>
          <p className="table-primary">{row.title}</p>
          {row.description && (
            <p className="table-secondary">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <Badge
          status={row.status.replace(/_/g, ' ')}
          tone={statusTone[row.status] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortValue: (row) => row.priority,
      render: (row) => (
        <Badge status={row.priority} tone={priorityTone[row.priority] ?? 'neutral'} />
      ),
    },
    {
      key: 'due_at',
      header: 'Due',
      sortValue: (row) => row.due_at ?? '',
      render: (row) => (
        <div>
          <p className="table-primary">{dueLabel(row.due_at)}</p>
          {isOverdue(row, now) && (
            <p className="table-secondary">
              <Badge status="overdue" tone="danger" />
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      sortValue: (row) => row.assigned_to ?? '',
      render: (row) => assigneeLabel(row.assigned_to, members),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="dialog-actions">
          {canManage && row.status !== 'done' && row.status !== 'cancelled' && (
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => void handleComplete(row)}
            >
              Complete
            </Button>
          )}
          {canManage && (
            <Button variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="tasks-heading">
      <div className="page-header">
        <div>
          <h1 id="tasks-heading">Tasks</h1>
          <p className="page-description">
            Property tasks with assignment, priorities, due dates, and an overdue
            state. Tasks are scoped to the selected property.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>New task</Button>}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before adding tasks."
        />
      ) : (
        <>
          <div className="field">
            <SelectField
              label="Property"
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>
          </div>

          {tasks.length > 0 && (
            <p className="stat-context">
              {`${openCount} open · ${overdueCount} overdue`}
            </p>
          )}

          <div className="field">
            <Field
              label="Search tasks"
              type="search"
              placeholder="Title, description, or source"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              optional
            />
          </div>

          <div className="field">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {taskStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(event) => setOverdueOnly(event.target.checked)}
              />
              Overdue only
            </label>
          </div>

          <DataTable
            columns={columns}
            rows={visibleTasks}
            rowKey={(row) => row.id}
            emptyMessage="No tasks yet for this property."
            emptyAction={
              canManage ? <Button onClick={openCreate}>New task</Button> : undefined
            }
          />

          <Dialog
            open={dialog !== 'none'}
            title={dialog === 'create' ? 'New task' : 'Edit task'}
            onClose={() => setDialog('none')}
          >
            <form onSubmit={handleSubmit} noValidate>
              {dialog === 'create' && (
                <SelectField
                  label="Property"
                  value={form.propertyId}
                  onChange={(event) =>
                    setForm({ ...form, propertyId: event.target.value })
                  }
                  required
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </SelectField>
              )}
              <Field
                label="Title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
              <Field
                label="Description"
                optional
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
              <div className="form-grid">
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  {taskStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm({ ...form, priority: event.target.value })
                  }
                >
                  {taskPriorities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Field
                label="Due"
                optional
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
              />
              <SelectField
                label="Assignee"
                optional
                value={form.assignedTo}
                onChange={(event) =>
                  setForm({ ...form, assignedTo: event.target.value })
                }
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name ?? member.email} ({member.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </SelectField>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <Button variant="secondary" onClick={() => setDialog('none')}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {dialog === 'create' ? 'Create task' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </section>
  );
}
export { TaskDetailPageWrapper } from './TaskDetailPage';
