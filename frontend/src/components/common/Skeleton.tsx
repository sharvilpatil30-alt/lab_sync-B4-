import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    rect: 'rounded-lg',
    circle: 'rounded-full',
  }[variant];

  return (
    <div
      className={`animate-pulse bg-slate-800/80 border border-slate-700/30 ${variantStyles} ${className}`}
    />
  );
};
