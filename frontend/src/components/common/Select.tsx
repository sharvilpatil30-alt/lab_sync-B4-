import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, helperText, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#102A43]">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-white border ${
            error ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#D9E2EC] focus:border-[#2563EB]'
          } rounded-lg text-[#102A43] text-sm px-3.5 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-[#102A43]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[#DC2626] mt-1 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#627D98] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
