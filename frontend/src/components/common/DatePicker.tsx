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
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type="date"
            className={`w-full bg-slate-900/90 border ${
              error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
            } rounded-lg text-slate-100 placeholder-slate-500 text-sm pl-10 pr-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [color-scheme:dark] ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
