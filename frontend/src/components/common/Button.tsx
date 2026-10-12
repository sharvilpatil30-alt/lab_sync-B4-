import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-[#0B1F3A] hover:bg-[#163A63] active:bg-[#061325] text-white shadow-sm border border-transparent disabled:bg-[#627D98]/50',
    secondary:
      'bg-[#EFF6FF] hover:bg-[#DBEAFE] active:bg-[#BFDBFE] text-[#163A63] border border-[#D9E2EC]',
    outline:
      'bg-white hover:bg-[#F8FAFC] active:bg-[#F0F4F8] text-[#0B1F3A] border border-[#D9E2EC] shadow-xs',
    ghost:
      'bg-transparent hover:bg-[#F0F4F8] active:bg-[#E2E8F0] text-[#627D98] hover:text-[#0B1F3A]',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-sm border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="text-current" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
