import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#627D98] py-3 ${className}`}>
      <div>
        {totalItems !== undefined && pageSize !== undefined ? (
          <span>
            Showing <strong className="text-[#102A43]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#102A43]">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-[#102A43]">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-[#102A43]">{currentPage}</strong> of{' '}
            <strong className="text-[#102A43]">{totalPages}</strong>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <span className="px-3 py-1 bg-[#F0F4F8] border border-[#D9E2EC] rounded-lg text-[#0B1F3A] font-semibold">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
