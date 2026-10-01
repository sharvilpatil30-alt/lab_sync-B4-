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
  const { isGoldPink, isEmeraldMint } = useTheme();

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const oceanCyanVariants = {
    primary: 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white shadow-lg shadow-cyan-600/30 active:scale-[0.98] focus:ring-cyan-500/50',
    secondary: 'bg-slate-900/90 hover:bg-slate-800 text-cyan-200 border border-cyan-800/60 active:scale-[0.98] focus:ring-cyan-500/40',
    outline: 'border border-cyan-700/60 hover:border-cyan-400 bg-transparent text-cyan-300 hover:text-white hover:bg-cyan-950/40 focus:ring-cyan-500/40',
    ghost: 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 focus:ring-cyan-500/30',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98] focus:ring-rose-500/50',
  };

  const emeraldMintVariants = {
    primary: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98] focus:ring-emerald-500/50',
    secondary: 'bg-slate-900/90 hover:bg-slate-800 text-emerald-200 border border-emerald-800/60 active:scale-[0.98] focus:ring-emerald-500/40',
    outline: 'border border-emerald-700/60 hover:border-emerald-400 bg-transparent text-emerald-300 hover:text-white hover:bg-emerald-950/40 focus:ring-emerald-500/40',
    ghost: 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 focus:ring-emerald-500/30',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98] focus:ring-rose-500/50',
  };

  const goldPinkVariants = {
    primary: 'bg-gradient-to-r from-amber-500 via-pink-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/25 border-transparent active:scale-[0.98] focus:ring-pink-400/50',
    secondary: 'bg-pink-50/90 hover:bg-pink-100/90 text-pink-700 border border-pink-200/90 hover:border-pink-300 shadow-xs active:scale-[0.98] focus:ring-pink-400/40',
    outline: 'border border-pink-300 hover:border-pink-400 bg-white/90 hover:bg-pink-50/80 text-slate-700 hover:text-pink-700 shadow-xs active:scale-[0.98] focus:ring-pink-400/40',
    ghost: 'text-slate-600 hover:text-pink-600 hover:bg-pink-50/80 active:scale-[0.98] focus:ring-pink-400/30',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 active:scale-[0.98] focus:ring-rose-400/50',
  };

  const variants = isGoldPink ? goldPinkVariants : isEmeraldMint ? emeraldMintVariants : oceanCyanVariants;

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
