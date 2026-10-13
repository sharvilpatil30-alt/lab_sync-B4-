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
      className={`animate-pulse bg-[#F0F4F8] border border-[#D9E2EC] ${variantStyles} ${className}`}
    />
  );
};
