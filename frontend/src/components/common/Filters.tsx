import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface FilterTag {
  id: string;
  label: string;
  value: string;
}

export interface FiltersProps {
  children?: React.ReactNode;
  activeTags?: FilterTag[];
  onRemoveTag?: (tagId: string) => void;
  onResetAll?: () => void;
  className?: string;
  title?: string;
}

export const Filters: React.FC<FiltersProps> = ({
  children,
  activeTags = [],
  onRemoveTag,
  onResetAll,
  className = '',
  title = 'Filters',
}) => {
  const hasActiveFilters = activeTags.length > 0;

  return (
    <div className={`p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 ${className}`}>
      {/* Controls Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
              {activeTags.length} active
            </span>
          )}
        </div>

        {hasActiveFilters && onResetAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetAll}
            className="text-xs text-slate-400 hover:text-white h-7 px-2"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Filter Inputs Grid Slot */}
      {children && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {children}
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 mr-1">Active:</span>
          {activeTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs"
            >
              <span className="text-slate-400">{tag.label}:</span>
              <strong className="font-semibold text-white">{tag.value}</strong>
              {onRemoveTag && (
                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="hover:text-rose-400 ml-0.5 transition-colors"
                  aria-label={`Remove filter ${tag.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
