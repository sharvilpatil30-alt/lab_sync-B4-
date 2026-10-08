import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, ChevronDown, Palette, Sun, Crown } from 'lucide-react';
import { useTheme, AppTheme } from '../../hooks';

interface ThemeToggleProps {
  className?: string;
  showDropdown?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showDropdown = true }) => {
  const { theme, setTheme, toggleTheme, isGoldPink } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: Array<{
    id: AppTheme;
    name: string;
    subtitle: string;
    badgeLabel: string;
    swatchBg: string;
    borderRing: string;
    description: string;
  }> = [
    {
      id: 'default',
      name: 'Cyber Slate & Indigo',
      subtitle: 'Original Dark Mode',
      badgeLabel: 'Dark Indigo',
      swatchBg: 'bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-600',
      borderRing: 'border-indigo-500/40 shadow-indigo-500/20',
      description: 'Cool indigo accents with deep slate glassmorphism',
    },
    {
      id: 'gold-pink',
      name: 'White, Gold & Pink',
      subtitle: 'Luxe Light Mode',
      badgeLabel: 'White, Gold & Pink',
      swatchBg: 'bg-gradient-to-tr from-amber-200 via-pink-100 to-rose-200',
      borderRing: 'border-pink-400 shadow-pink-300/40',
      description: 'Pristine white backgrounds with warm gold & rose pink highlights',
    },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Theme Icon Button */}
      <button
        type="button"
        onClick={() => {
          if (showDropdown) {
            setIsOpen(!isOpen);
          } else {
            toggleTheme();
          }
        }}
        title={`Theme: ${isGoldPink ? 'White, Gold & Pink' : 'Cyber Slate (Default)'} - Click to switch`}
        className={`group relative flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-300 ${
          isGoldPink
            ? 'bg-white border-pink-300 hover:border-pink-400 text-pink-700 shadow-sm shadow-pink-200/50'
            : 'bg-slate-900/90 border-slate-700/80 hover:border-indigo-500/50 text-slate-300 hover:text-white shadow-md shadow-slate-950/40'
        }`}
        aria-label="Toggle Theme"
        aria-expanded={isOpen}
      >
        {/* Dynamic Theme Icon Orb (No Insta icon) */}
        <div className="relative flex items-center justify-center">
          {isGoldPink ? (
            /* Gold & Pink Radiant Sun/Sparkle Icon */
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-400 to-pink-500 p-0.5 shadow-sm shadow-pink-400/40 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          ) : (
            /* First theme: "This" (Cyber Slate & Indigo default) */
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-slate-900 via-indigo-900 to-indigo-500 p-0.5 border border-indigo-400/50 shadow-sm shadow-indigo-500/30 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-indigo-300" />
            </div>
          )}

          {/* Ambient Glow behind icon */}
          <span
            className={`absolute -inset-1 rounded-full blur-sm -z-10 transition-opacity duration-300 ${
              isGoldPink
                ? 'bg-gradient-to-r from-amber-300/60 via-pink-400/60 to-rose-400/60 opacity-80 group-hover:opacity-100'
                : 'bg-indigo-500/30 opacity-40 group-hover:opacity-80'
            }`}
          />
        </div>

        {/* Text Label on larger screens */}
        <span className="hidden md:inline-block text-xs font-semibold tracking-tight">
          {isGoldPink ? (
            <span className="text-pink-700 font-bold flex items-center gap-1">
              <span>White</span>
              <span className="text-amber-500">•</span>
              <span className="text-amber-600 font-extrabold">Gold</span>
              <span className="text-pink-400">&</span>
              <span className="text-pink-700 font-extrabold">Pink</span>
            </span>
          ) : (
            <span className="text-slate-200">Default Theme</span>
          )}
        </span>

        {showDropdown && (
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isGoldPink ? 'text-pink-600' : 'text-slate-400'
            } ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Theme Selection Dropdown Popover */}
      {showDropdown && isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-full mt-1.5 w-auto sm:w-84 max-w-sm rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-xl ${
              isGoldPink
                ? 'bg-white/95 border-pink-200 shadow-pink-200/50 text-slate-800'
                : 'bg-slate-950/98 border-slate-800 shadow-slate-950/80 text-slate-100'
            }`}
          >
          <div
            className={`flex items-center justify-between pb-2 mb-2 border-b px-1 ${
              isGoldPink ? 'border-pink-100 text-slate-600' : 'border-slate-800/80 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Palette className={`w-3.5 h-3.5 ${isGoldPink ? 'text-pink-600' : 'text-indigo-400'}`} />
              <span>Appearance Theme</span>
            </div>
            <span className="text-[10px] font-mono opacity-60">2 Colorways</span>
          </div>

          <div className="space-y-2">
            {themes.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 group/item ${
                    isSelected
                      ? item.id === 'gold-pink'
                        ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-pink-50 border-pink-300 shadow-md shadow-pink-100'
                        : 'bg-indigo-950/50 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                      : isGoldPink
                      ? 'bg-slate-50/70 border-slate-200 hover:bg-pink-50/50 hover:border-pink-200'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Visual Swatch (No Insta icon) */}
                    <div
                      className={`w-9 h-9 rounded-xl ${item.swatchBg} p-0.5 border ${item.borderRing} flex items-center justify-center shrink-0 shadow-md group-hover/item:scale-105 transition-transform`}
                    >
                      {item.id === 'gold-pink' ? (
                        /* Gold & Pink dual tone orb */
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center shadow-inner">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        /* Slate & Indigo orb */
                        <div className="w-4 h-4 rounded-full bg-indigo-500/80 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold ${
                            isSelected
                              ? item.id === 'gold-pink'
                                ? 'text-pink-700 font-extrabold'
                                : 'text-indigo-300 font-extrabold'
                              : isGoldPink
                              ? 'text-slate-800'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase font-semibold ${
                            item.id === 'gold-pink'
                              ? 'bg-pink-100 text-pink-700 border border-pink-200'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {item.badgeLabel}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 leading-tight ${
                          isGoldPink ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Checkmark Indicator */}
                  {isSelected && (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        item.id === 'gold-pink'
                          ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-500 text-white shadow-sm'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] px-1 ${
              isGoldPink ? 'border-pink-100 text-slate-500' : 'border-slate-800/80 text-slate-500'
            }`}
          >
            <span>Live Color Switch</span>
            <button
              type="button"
              onClick={toggleTheme}
              className={`font-semibold transition-colors ${
                isGoldPink ? 'text-pink-600 hover:text-pink-700' : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              Toggle directly (1-click)
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
