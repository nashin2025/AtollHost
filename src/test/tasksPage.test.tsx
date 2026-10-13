import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const {
  listMyMemberships,
  listOrganizationMembers,
  listProperties,
  listTasks,
  createTask,
  updateTask,
} = vi.hoisted(() => ({
  listMyMemberships: vi.fn(),
  listOrganizationMembers: vi.fn(),
  listProperties: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../lib/memberships', () => ({
  listMyMemberships: () => listMyMemberships(),
}));

vi.mock('../lib/properties', () => ({
  listProperties: () => listProperties(),
  listOrganizationMembers: () => listOrganizationMembers(),
}));

vi.mock('../lib/tasks', () => ({
  listTasks: () => listTasks(),
  createTask: () => createTask(),
  updateTask: () => updateTask(),
}));

import { TasksPage } from '../features/tasks/TasksPage';

const futureDue = new Date(Date.now() + 86_400_000).toISOString();
const pastDue = new Date(Date.now() - 86_400_000).toISOString();

const tasks = [
  {
    id: 't1',
    property_id: 'p1',
    assigned_to: 'user-1',
    title: 'Reply to Kohl-Farid enquiry',
    description: 'Confirm availability for March dates.',
    status: 'in_progress',
    priority: 'high',
    due_at: futureDue,
    source: null,
    comments_count: 0,
    last_activity_at: futureDue,
    created_at: futureDue,
    updated_at: futureDue,
  },
  {
    id: 't2',
    property_id: 'p1',
    assigned_to: null,
    title: 'Update seasonal rates',
    description: null,
    status: 'todo',
    priority: 'normal',
    due_at: pastDue,
    source: null,
    comments_count: 0,
    last_activity_at: pastDue,
    created_at: pastDue,
    updated_at: pastDue,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <TasksPage />
    </MemoryRouter>,
  );
}

describe('TasksPage', () => {
  it('renders tasks with status, priority, assignee, and overdue marker', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([
      {
        id: 'p1',
        organization_id: 'org-1',
        name: 'Coral Lagoon Guesthouse',
        island: 'Thulusdhoo',
        atoll: 'Kaafu',
        status: 'active',
        phone: null,
        email: null,
        address: null,
        organization: { name: 'Demo Agency' },
      },
    ]);
    listOrganizationMembers.mockResolvedValue([
      { user_id: 'user-1', role: 'agency_admin', full_name: 'Nashin', email: 'nashin@example.com' },
    ]);
    listTasks.mockResolvedValue(tasks);

    renderPage();

    expect(await screen.findByText('Reply to Kohl-Farid enquiry')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
    expect(screen.getByText('Nashin')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('2 open · 1 overdue')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Complete' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
  });

  it('shows the empty state when a property has no tasks', async () => {
    listMyMemberships.mockResolvedValue([
      {
        organization_id: 'org-1',
        role: 'agency_admin',
        organization: { name: 'Demo Agency' },
      },
    ]);
    listProperties.mockResolvedValue([
      {
        id: 'p1',
        organization_id: 'org-1',
        name: 'Coral Lagoon Guesthouse',
        island: 'Thulusdhoo',
        atoll: 'Kaafu',
        status: 'active',
        phone: null,
        email: null,
        address: null,
        organization: { name: 'Demo Agency' },
      },
    ]);
    listOrganizationMembers.mockResolvedValue([]);
    listTasks.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('No tasks yet for this property.'),
    ).toBeInTheDocument();
  });
});
