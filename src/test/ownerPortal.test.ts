import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  getOwnerDashboard,
  grantOwnerAccess,
  revokeOwnerAccess,
  recordSecurityAudit,
  updateSecurityAudit,
  scheduleBackupJob,
  completeBackupJob,
  listSecurityAudits,
  listBackupJobs,
  listOwnerPropertyAccess,
  type OwnerPropertyAccessForm,
} from '../lib/ownerPortal';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq', 'single']) {
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

describe('getOwnerDashboard', () => {
  it('fetches dashboard data for owner and property', async () => {
    const dashboard = {
      revenue: { total: 10000, last_30d: 2000, currency: 'MVR' },
      occupancy: { total_rooms: 20, occupied_last_30d: 15 },
      enquiries: { total: 50, open: 10, won: 30, conversion_rate: 60 },
      reviews: { total: 100, published: 80, avg_rating: 4.5 },
      tasks: { total: 200, completed: 150, overdue: 5 },
      knowledge: { total_facts: 50, approved: 40 },
    };
    const client = mockClient({ invoke: { data: dashboard } });
    const result = await getOwnerDashboard(client, 'owner1', 'p1');
    expect(result.revenue.total).toBe(10000);
    expect(result.enquiries.conversion_rate).toBe(60);
    expect(client.functions.invoke).toHaveBeenCalledWith('get-owner-dashboard', {
      body: { owner_id: 'owner1', property_id: 'p1' },
    });
  });
});

describe('grantOwnerAccess', () => {
  it('grants owner access with permissions', async () => {
    const form: OwnerPropertyAccessForm = {
      owner_id: 'owner1',
      property_id: 'p1',
      organization_id: 'org1',
      permissions: { can_view_revenue: true, can_view_reports: false },
    };
    const client = mockClient({ invoke: { data: { access_id: 'acc1' } } });
    const result = await grantOwnerAccess(client, form);
    expect(result.access_id).toBe('acc1');
    expect(client.functions.invoke).toHaveBeenCalledWith('grant-owner-access', {
      body: form,
    });
  });
});

describe('revokeOwnerAccess', () => {
  it('revokes owner access', async () => {
    const client = mockClient({ invoke: { data: { revoked: true } } });
    const result = await revokeOwnerAccess(client, 'owner1', 'p1');
    expect(result.revoked).toBe(true);
    expect(client.functions.invoke).toHaveBeenCalledWith('revoke-owner-access', {
      body: { owner_id: 'owner1', property_id: 'p1' },
    });
  });
});

describe('recordSecurityAudit', () => {
  it('records a security audit', async () => {
    const client = mockClient({ invoke: { data: { audit_id: 'audit1' } } });
    const result = await recordSecurityAudit(client, {
      organization_id: 'org1',
      property_id: 'p1',
      audit_type: 'dependency_scan',
      status: 'scheduled',
      severity: 'high',
      scheduled_for: '2026-10-15T00:00:00Z',
    });
    expect(result.audit_id).toBe('audit1');
  });
});

describe('updateSecurityAudit', () => {
  it('updates security audit status', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await updateSecurityAudit(client, 'audit1', 'completed', [], 'high');
    expect(client.functions.invoke).toHaveBeenCalledWith('update-security-audit', {
      body: { audit_id: 'audit1', status: 'completed', findings: [], severity: 'high' },
    });
  });
});

describe('scheduleBackupJob', () => {
  it('schedules a backup job', async () => {
    const client = mockClient({ invoke: { data: { job_id: 'job1' } } });
    const result = await scheduleBackupJob(client, {
      organization_id: 'org1',
      backup_type: 'full',
      tables: ['enquiries', 'tasks'],
    });
    expect(result.job_id).toBe('job1');
  });
});

describe('completeBackupJob', () => {
  it('completes a backup job', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await completeBackupJob(client, 'job1', 'completed', '/backups/full_20261012.sql', 1024000, null);
    expect(client.functions.invoke).toHaveBeenCalledWith('complete-backup-job', {
      body: { job_id: 'job1', status: 'completed', storage_path: '/backups/full_20261012.sql', size_bytes: 1024000, error: null },
    });
  });
});

describe('listSecurityAudits', () => {
  it('lists security audits for organization', async () => {
    const rows = [
      { id: 'a1', organization_id: 'org1', audit_type: 'dependency_scan', status: 'completed' },
    ];
    const client = mockClient({ query: { data: rows } });
    const audits = await listSecurityAudits(client, 'org1');
    expect(audits).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('security_audit_log');
  });
});

describe('listBackupJobs', () => {
  it('lists backup jobs for organization', async () => {
    const rows = [
      { id: 'b1', organization_id: 'org1', backup_type: 'full', status: 'completed' },
    ];
    const client = mockClient({ query: { data: rows } });
    const jobs = await listBackupJobs(client, 'org1');
    expect(jobs).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('backup_jobs');
  });
});

describe('listOwnerPropertyAccess', () => {
  it('lists owner property access', async () => {
    const rows = [
      { id: 'acc1', owner_id: 'owner1', property_id: 'p1', organization_id: 'org1', can_view_revenue: true },
    ];
    const client = mockClient({ query: { data: rows } });
    const access = await listOwnerPropertyAccess(client, 'owner1');
    expect(access).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('owner_property_access');
  });
});