import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { useState, useCallback, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import type { Task } from '../../lib/tasks';

type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; order: number; wipLimit?: number }> = {
  backlog: { label: 'Backlog', color: 'var(--color-gray-500)', order: 0 },
  todo: { label: 'To Do', color: 'var(--color-blue-500)', order: 1, wipLimit: 8 },
  in_progress: { label: 'In Progress', color: 'var(--color-orange-500)', order: 2, wipLimit: 5 },
  in_review: { label: 'In Review', color: 'var(--color-purple-500)', order: 3, wipLimit: 3 },
  done: { label: 'Done', color: 'var(--color-green-500)', order: 4 },
  cancelled: { label: 'Cancelled', color: 'var(--color-red-500)', order: 5 },
};

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

interface KanbanBoardProps {
  propertyId: string;
  _organizationId?: string;
  _userId?: string;
  _userRole?: string;
}

function TaskCard({ task, isDragging }: { task: Task; isDragging: boolean }) {
  const priorityColors: Record<string, string> = {
    urgent: 'var(--color-red-500)',
    high: 'var(--color-orange-500)',
    medium: 'var(--color-blue-500)',
    low: 'var(--color-gray-500)',
  };

  return (
    <div
      style={{
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 150ms ease, box-shadow 150ms ease',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      }}
    >
      <Card className="task-card" style={{ padding: 'var(--space-3)', cursor: 'grab' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <Badge variant="outline" style={{ fontSize: 'var(--font-size-xs)' }}>
                {task.id.slice(0, 8).toUpperCase()}
              </Badge>
              {task.priority && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: priorityColors[task.priority] || 'var(--color-gray-500)',
                    flexShrink: 0,
                  }}
                  title={task.priority}
                />
              )}
            </div>
            <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, lineHeight: 1.3 }}>
              {task.title}
            </h4>
            {task.description && (
              <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {task.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
              {task.assignee && (
                <Avatar
                  name={task.assignee.full_name}
                  size="sm"
                  style={{ flexShrink: 0 }}
                />
              )}
              {task.due_date && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: new Date(task.due_date) < new Date() ? 'var(--color-red-500)' : 'var(--color-text-muted)' }}>
                  {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}
              {task.labels?.map((label) => (
                <Badge key={label.id} variant="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
                  {label.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  provided,
  snapshot,
}: {
  status: TaskStatus;
  tasks: Task[];
  provided: DroppableProvided;
  snapshot: DroppableStateSnapshot;
}) {
  const config = STATUS_CONFIG[status];
  const isOver = snapshot.isDraggingOver;

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      style={{
        flex: '1 1 280px',
        maxWidth: '320px',
        minWidth: '280px',
        backgroundColor: isOver ? 'var(--color-primary-bg)' : 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-border)',
        transition: 'all 150ms ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '400px',
      }}
    >
      <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: config.color }}>
            {config.label}
          </h3>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {tasks.length}{config.wipLimit ? ` / ${config.wipLimit}` : ''}
          </span>
        </div>
        {config.wipLimit && tasks.length >= config.wipLimit && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-red-500)', fontWeight: 500 }}>
            WIP limit reached
          </div>
        )}
      </div>
      <div
        {...provided.droppableProps}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-2)',
          minHeight: '300px',
        }}
      >
        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(provided, snapshot) => (
              <TaskCard
                task={task}
                _index={index}
                isDragging={snapshot.isDragging}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              />
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
      <div style={{ padding: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" className="w-full">
          + Add task
        </Button>
      </div>
    </div>
  );
}

export function KanbanBoard({ propertyId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:organization_members!tasks_assignee_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          labels:task_labels (
            label:labels (id, name, color)
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [fetchTasks]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
        return;
      }

      const newStatus = destination.droppableId as TaskStatus;
      updateTaskStatus(draggableId, newStatus);
    },
    [updateTaskStatus]
  );

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    };
    tasks.forEach((task) => {
      const status = (task.status as TaskStatus) || 'backlog';
      grouped[status].push(task);
    });
    return grouped;
  }, [tasks]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-red-500)' }}>
        {error}
        <Button onClick={fetchTasks} variant="outline" style={{ marginTop: 'var(--space-2)' }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', overflowX: 'auto', padding: 'var(--space-4)', minHeight: '500px' }}>
        {STATUS_ORDER.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(provided, snapshot) => (
              <KanbanColumn
                status={status}
                tasks={columns[status]}
                onDragEnd={handleDragEnd}
                provided={provided}
                snapshot={snapshot}
              />
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

KanbanBoard.displayName = 'KanbanBoard';