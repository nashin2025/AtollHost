import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage: string;
  emptyAction?: ReactNode;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage,
  emptyAction,
  pageSize = 20,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) {
      return rows;
    }
    const column = columns.find((entry) => entry.key === sortKey);
    if (!column?.sortValue) {
      return rows;
    }
    return [...rows].sort((a, b) => {
      const left = column.sortValue?.(a);
      const right = column.sortValue?.(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDir === 'asc' ? left - right : right - left;
      }
      const comparison = String(left).localeCompare(String(right));
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div className="state-loading" role="status">
        <span className="sr-only">Loading table</span>
        <span className="skeleton skeleton-line" aria-hidden="true" />
        <span className="skeleton skeleton-line" aria-hidden="true" />
        <span className="skeleton skeleton-line" aria-hidden="true" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="state-empty">
        <h3>No results</h3>
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.sortValue ? (
                  <button
                    type="button"
                    className="table-sort"
                    onClick={() => toggleSort(column.key)}
                    aria-sort={
                      sortKey === column.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.header}
                    <span aria-hidden="true" className="table-sort-indicator">
                      {sortKey === column.key
                        ? sortDir === 'asc'
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-pagination">
        <p>
          Page {currentPage + 1} of {pageCount}
        </p>
        <div className="table-pagination-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              setPage((value) => Math.min(pageCount - 1, value + 1))
            }
            disabled={currentPage >= pageCount - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
