import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  listReportDefinitions,
  executeReport,
  getReportRun,
  type ExecuteReportInput,
} from '../lib/reports';

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

describe('listReportDefinitions', () => {
  it('sends organization_id to list-report-definitions function', async () => {
    const definitions = [
      { id: 'd1', name: 'Property Performance', is_system: true, parameters: [] },
    ];
    const client = mockClient({ invoke: { data: { definitions } } });
    const result = await listReportDefinitions(client, 'org1');
    expect(result).toEqual(definitions);
    expect(client.functions.invoke).toHaveBeenCalledWith('list-report-definitions', {
      body: { organization_id: 'org1' },
    });
  });
});

describe('executeReport', () => {
  it('sends the input to the execute-report function', async () => {
    const input: ExecuteReportInput = {
      definition_id: 'd1',
      organization_id: 'org1',
      property_id: 'p1',
      parameters: { date_from: '2026-01-01' },
    };
    const client = mockClient({ invoke: { data: { run_id: 'r1' } } });
    const result = await executeReport(client, input);
    expect(result.run_id).toBe('r1');
    expect(client.functions.invoke).toHaveBeenCalledWith('execute-report', {
      body: input,
    });
  });
});

describe('getReportRun', () => {
  it('fetches a report run by id', async () => {
    const run = { id: 'r1', definition_id: 'd1', status: 'completed', row_count: 10 };
    const client = mockClient({ query: { data: run } });
    const result = await getReportRun(client, 'r1');
    expect(result).toEqual(run);
    expect(client.from).toHaveBeenCalledWith('report_runs');
  });

  it('returns null for not found', async () => {
    const client = mockClient({ query: { data: null, error: { code: 'PGRST116', message: 'not found' } } });
    const result = await getReportRun(client, 'r1');
    expect(result).toBeNull();
  });
});