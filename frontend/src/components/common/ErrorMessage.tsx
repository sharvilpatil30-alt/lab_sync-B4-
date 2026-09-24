import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 ${className}`}
    >
      <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
        <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="border-rose-500/30 text-rose-300 hover:bg-rose-500/20 shrink-0 mt-2 sm:mt-0"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
