import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface Task {
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
}

export interface TaskForm {
  property_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  source: string | null;
}

export interface TaskUpdate {
  task_id: string;
  property_id: string;
  assigned_to: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_at: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export async function createTask(
  client: SupabaseClient,
  form: TaskForm,
): Promise<{ task_id: string }> {
  return invokeFunction<{ task_id: string }>(client, 'create-task', form);
}

export async function updateTask(
  client: SupabaseClient,
  input: TaskUpdate,
): Promise<void> {
  await invokeFunction(client, 'update-task', input);
}

export async function listTasks(
  client: SupabaseClient,
  propertyId: string,
): Promise<Task[]> {
  const { data, error } = await client
    .from('tasks')
    .select('id, property_id, assigned_to, title, description, status, priority, due_at, source, comments_count, last_activity_at, created_at, updated_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Task[];
}

export async function listTaskComments(
  client: SupabaseClient,
  taskId: string,
): Promise<TaskComment[]> {
  const { data, error } = await client
    .from('task_comments')
    .select('id, task_id, author_id, body, mentions, created_at, updated_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TaskComment[];
}

export async function addTaskComment(
  client: SupabaseClient,
  taskId: string,
  body: string,
  mentions: string[] = [],
): Promise<{ comment_id: string }> {
  return invokeFunction<{ comment_id: string }>(client, 'add-task-comment', {
    task_id: taskId,
    body,
    mentions,
  });
}