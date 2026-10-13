import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

export interface SearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export const Search: React.FC<SearchProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  debounceMs = 300,
  className = '',
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, onChange, debounceMs, value]);

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <SearchIcon className="absolute left-3 w-4 h-4 text-[#627D98] pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#D9E2EC] focus:border-[#2563EB] rounded-lg text-[#102A43] placeholder-[#829AB1] text-sm pl-9 pr-8 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-2.5 p-0.5 rounded text-[#627D98] hover:text-[#0B1F3A] hover:bg-[#F0F4F8]"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
