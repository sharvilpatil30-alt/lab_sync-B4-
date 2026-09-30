import React from 'react';
import { Spinner } from './Spinner';
import { useTheme } from '../../hooks';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const { isGoldPink } = useTheme();

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const defaultVariants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] focus:ring-indigo-500/50',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-[0.98] focus:ring-slate-500/50',
    outline: 'border border-slate-700 hover:border-slate-600 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/50 focus:ring-slate-500/50',
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus:ring-slate-500/50',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98] focus:ring-rose-500/50',
  };

  const goldPinkVariants = {
    primary: 'bg-gradient-to-r from-amber-500 via-pink-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/25 border-transparent active:scale-[0.98] focus:ring-pink-400/50',
    secondary: 'bg-pink-50/90 hover:bg-pink-100/90 text-pink-700 border border-pink-200/90 hover:border-pink-300 shadow-xs active:scale-[0.98] focus:ring-pink-400/40',
    outline: 'border border-pink-300 hover:border-pink-400 bg-white/90 hover:bg-pink-50/80 text-slate-700 hover:text-pink-700 shadow-xs active:scale-[0.98] focus:ring-pink-400/40',
    ghost: 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/80 active:scale-[0.98] focus:ring-pink-400/30',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 active:scale-[0.98] focus:ring-rose-400/50',
  };

  const variants = isGoldPink ? goldPinkVariants : defaultVariants;

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
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
        <Spinner size="sm" className="text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
