import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createTask,
  updateTask,
  listTasks,
  listTaskComments,
  addTaskComment,
  type TaskForm,
} from '../lib/tasks';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq']) {
    thenable[method] = vi.fn(() => thenable);
  }
  thenable.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data, error });
  return thenable;
}

function mockClient(options: {
  query?: { data: unknown; error?: unknown };
  invoke?: { data: unknown; error?: unknown };
}) {
  return {
    from: vi.fn(() =>
      mockQuery(options.query?.data ?? [], options.query?.error ?? null),
    ),
    functions: {
      invoke: vi.fn(() =>
        Promise.resolve({
          data: options.invoke?.data ?? {},
          error: options.invoke?.error ?? null,
        }),
      ),
    },
  } as unknown as SupabaseClient;
}

const taskForm: TaskForm = {
  property_id: 'p1',
  assigned_to: null,
  title: 'Clean room 101',
  description: 'Deep clean before check-in',
  status: 'todo',
  priority: 'normal',
  due_at: null,
  source: 'manual',
};

describe('createTask', () => {
  it('sends the form to the create-task function', async () => {
    const client = mockClient({ invoke: { data: { task_id: 't1' } } });
    const result = await createTask(client, taskForm);
    expect(result.task_id).toBe('t1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-task', {
      body: taskForm,
    });
  });

  it('surfaces function errors', async () => {
    const client = mockClient({
      invoke: { data: null, error: { message: 'title is required' } },
    });
    await expect(createTask(client, taskForm)).rejects.toThrow(
      'title is required',
    );
  });
});

describe('updateTask', () => {
  it('sends the update to the update-task function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await updateTask(client, {
      task_id: 't1',
      property_id: 'p1',
      assigned_to: 'u1',
      title: 'Updated title',
      description: 'Updated desc',
      status: 'in_progress',
      priority: 'high',
      due_at: '2026-10-15T10:00:00Z',
    });
    expect(client.functions.invoke).toHaveBeenCalledWith('update-task', {
      body: {
        task_id: 't1',
        property_id: 'p1',
        assigned_to: 'u1',
        title: 'Updated title',
        description: 'Updated desc',
        status: 'in_progress',
        priority: 'high',
        due_at: '2026-10-15T10:00:00Z',
      },
    });
  });
});

describe('listTasks', () => {
  it('lists tasks for the property', async () => {
    const rows = [
      { id: 't1', property_id: 'p1', title: 'Task 1', status: 'todo' },
    ];
    const client = mockClient({ query: { data: rows } });
    const tasks = await listTasks(client, 'p1');
    expect(tasks).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('tasks');
  });
});

describe('listTaskComments', () => {
  it('lists comments for the task', async () => {
    const rows = [
      { id: 'c1', task_id: 't1', author_id: 'u1', body: 'Comment 1' },
    ];
    const client = mockClient({ query: { data: rows } });
    const comments = await listTaskComments(client, 't1');
    expect(comments).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('task_comments');
  });
});

describe('addTaskComment', () => {
  it('sends comment to add-task-comment function', async () => {
    const client = mockClient({ invoke: { data: { comment_id: 'c1' } } });
    const result = await addTaskComment(client, 't1', 'New comment', ['u2']);
    expect(result.comment_id).toBe('c1');
    expect(client.functions.invoke).toHaveBeenCalledWith('add-task-comment', {
      body: { task_id: 't1', body: 'New comment', mentions: ['u2'] },
    });
  });
});