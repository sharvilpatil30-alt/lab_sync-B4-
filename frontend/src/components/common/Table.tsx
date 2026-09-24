import React from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display at this time.',
  onRowClick,
  className = '',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm ${className}`}>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors duration-150 ${
                onRowClick ? 'cursor-pointer hover:bg-slate-800/50' : 'hover:bg-slate-800/30'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] !== undefined
                    ? String((item as Record<string, unknown>)[col.key])
                    : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
