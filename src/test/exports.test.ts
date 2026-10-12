import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  type CreateExportInput,
} from '../lib/exports';

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

const exportInput: CreateExportInput = {
  organization_id: 'org1',
  property_id: 'p1',
  source_type: 'enquiries',
  source_query: null,
  filters: { status: 'open' },
  format: 'csv',
};

describe('createExportJob', () => {
  it('sends the input to the create-export-job function', async () => {
    const client = mockClient({ invoke: { data: { job_id: 'ej1' } } });
    const result = await createExportJob(client, exportInput);
    expect(result.job_id).toBe('ej1');
    expect(client.functions.invoke).toHaveBeenCalledWith('create-export-job', {
      body: exportInput,
    });
  });
});

describe('getExportJob', () => {
  it('fetches an export job by id', async () => {
    const job = { id: 'ej1', organization_id: 'org1', status: 'completed' };
    const client = mockClient({ invoke: { data: job } });
    const result = await getExportJob(client, 'ej1');
    expect(result).toEqual(job);
    expect(client.functions.invoke).toHaveBeenCalledWith('get-export-job', {
      body: { job_id: 'ej1' },
    });
  });
});

describe('listExportJobs', () => {
  it('lists export jobs for the organization', async () => {
    const rows = [
      { id: 'ej1', organization_id: 'org1', source_type: 'enquiries', status: 'completed' },
    ];
    const client = mockClient({ query: { data: rows } });
    const jobs = await listExportJobs(client, 'org1');
    expect(jobs).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('export_jobs');
  });
});