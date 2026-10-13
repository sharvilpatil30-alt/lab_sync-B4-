import React from 'react';
import { Calendar } from 'lucide-react';

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#102A43]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#2563EB]">
            <Calendar className="w-4 h-4" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type="date"
            className={`w-full bg-white border ${
              error ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#D9E2EC] focus:border-[#2563EB]'
            } rounded-lg text-[#102A43] placeholder-[#829AB1] text-sm pl-10 pr-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 [color-scheme:light] ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#DC2626] mt-1 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#627D98] mt-1">{helperText}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
