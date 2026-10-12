import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  listFindings,
  listScannerRuns,
  reviewFinding,
  startScannerRun,
} from '../lib/scanner';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'in', 'eq']) {
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

describe('listScannerRuns', () => {
  it('lists runs newest first with the property name', async () => {
    const rows = [
      {
        id: 'a1',
        target_name: 'Coral House site',
        status: 'completed',
        score: 83,
        property: { name: 'Coral House' },
      },
    ];
    const client = mockClient({ query: { data: rows } });
    const runs = await listScannerRuns(client);
    expect(runs).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('scanner_audits');
  });

  it('propagates query errors', async () => {
    const client = mockClient({
      query: { data: null, error: { message: 'denied' } },
    });
    await expect(listScannerRuns(client)).rejects.toThrow('denied');
  });
});

describe('listFindings', () => {
  it('returns findings for the given audit ids', async () => {
    const rows = [
      {
        id: 'f1',
        scanner_audit_id: 'a1',
        severity: 'high',
        status: 'pending_review',
      },
    ];
    const client = mockClient({ query: { data: rows } });
    const findings = await listFindings(client, ['a1']);
    expect(findings).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('scanner_findings');
  });

  it('skips the query when there are no runs', async () => {
    const client = mockClient({ query: { data: [] } });
    const findings = await listFindings(client, []);
    expect(findings).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('startScannerRun', () => {
  it('sends the scan request to the run-scanner function', async () => {
    const client = mockClient({
      invoke: {
        data: {
          audit_id: 'a1',
          status: 'completed',
          score: 100,
          summary: '6 of 6 checks passed.',
          findings_count: 6,
          robots_blocked: false,
        },
      },
    });
    const result = await startScannerRun(client, {
      organization_id: 'org1',
      property_id: 'p1',
      target_name: 'Coral House site',
      target_url: 'https://coralhouse.example.com',
    });
    expect(result.audit_id).toBe('a1');
    expect(client.functions.invoke).toHaveBeenCalledWith('run-scanner', {
      body: {
        organization_id: 'org1',
        property_id: 'p1',
        target_name: 'Coral House site',
        target_url: 'https://coralhouse.example.com',
      },
    });
  });

  it('surfaces rate limiting from the server', async () => {
    const client = mockClient({
      invoke: {
        data: null,
        error: {
          message: 'this target was scanned recently',
          context: {
            error: {
              code: 'RATE_LIMITED',
              message: 'this target was scanned recently',
              request_id: 'req-2',
              details: [],
            },
          },
        },
      },
    });
    await expect(
      startScannerRun(client, {
        organization_id: 'org1',
        property_id: 'p1',
        target_name: 'Coral House site',
        target_url: 'https://coralhouse.example.com',
      }),
    ).rejects.toThrow('this target was scanned recently');
  });
});

describe('reviewFinding', () => {
  it('sends the verdict to the review-finding function', async () => {
    const client = mockClient({ invoke: { data: { reviewed: true } } });
    await reviewFinding(client, 'f1', 'approved');
    expect(client.functions.invoke).toHaveBeenCalledWith('review-finding', {
      body: { finding_id: 'f1', status: 'approved' },
    });
  });
});
