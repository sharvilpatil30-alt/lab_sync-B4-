import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#102A43]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#627D98]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white border ${
              error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20'
                : 'border-[#D9E2EC] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
            } rounded-lg text-[#102A43] placeholder-[#829AB1] text-sm px-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#627D98]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#DC2626] mt-1 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#627D98] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
