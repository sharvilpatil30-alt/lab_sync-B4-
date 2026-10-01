import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, ChevronDown, Palette, Sun, Crown, Waves, Leaf } from 'lucide-react';
import { useTheme, AppTheme } from '../../hooks';

interface ThemeToggleProps {
  className?: string;
  showDropdown?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showDropdown = true }) => {
  const { theme, setTheme, toggleTheme, isGoldPink, isEmeraldMint, isOceanCyan } = useTheme();
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
      name: 'Midnight Ocean & Cyan',
      subtitle: 'Luminous Marine Tech',
      badgeLabel: 'Electric Cyan',
      swatchBg: 'bg-gradient-to-tr from-slate-950 via-cyan-950 to-cyan-500',
      borderRing: 'border-cyan-400/50 shadow-cyan-500/25',
      description: 'Deep marine obsidian with glowing cyan & electric teal highlights',
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
    {
      id: 'emerald-mint',
      name: 'Emerald Matrix & Mint',
      subtitle: 'Bio-Tech Dark Mode',
      badgeLabel: 'Cyber Mint',
      swatchBg: 'bg-gradient-to-tr from-slate-950 via-emerald-950 to-emerald-500',
      borderRing: 'border-emerald-500/50 shadow-emerald-500/25',
      description: 'Deep obsidian forest with crisp neon mint & emerald accents',
    },
  ];

  const currentThemeObj = themes.find((t) => t.id === theme) || themes[0];

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
        title={`Theme: ${currentThemeObj.name} - Click to switch`}
        className={`group relative flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all duration-300 ${
          isGoldPink
            ? 'bg-white border-pink-300 hover:border-pink-400 text-pink-700 shadow-sm shadow-pink-200/50'
            : isEmeraldMint
            ? 'bg-slate-900/90 border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white shadow-md shadow-emerald-950/40'
            : 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white shadow-md shadow-slate-950/40'
        }`}
        aria-label="Toggle Theme"
        aria-expanded={isOpen}
      >
        {/* Dynamic Theme Icon Orb */}
        <div className="relative flex items-center justify-center">
          {isGoldPink ? (
            /* Gold & Pink Radiant Sun/Sparkle Icon */
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-400 to-pink-500 p-0.5 shadow-sm shadow-pink-400/40 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          ) : isEmeraldMint ? (
            /* Emerald Matrix Leaf Icon */
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-slate-900 via-emerald-950 to-emerald-500 p-0.5 border border-emerald-400/50 shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Leaf className="w-3 h-3 text-emerald-300" />
            </div>
          ) : (
            /* Midnight Ocean & Cyan Waves Icon */
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-slate-950 via-cyan-950 to-cyan-500 p-0.5 border border-cyan-400/50 shadow-sm shadow-cyan-500/30 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Waves className="w-3 h-3 text-cyan-300" />
            </div>
          )}

          {/* Ambient Glow behind icon */}
          <span
            className={`absolute -inset-1 rounded-full blur-sm -z-10 transition-opacity duration-300 ${
              isGoldPink
                ? 'bg-gradient-to-r from-amber-300/60 via-pink-400/60 to-rose-400/60 opacity-80 group-hover:opacity-100'
                : isEmeraldMint
                ? 'bg-emerald-500/30 opacity-60 group-hover:opacity-100'
                : 'bg-cyan-500/30 opacity-60 group-hover:opacity-100'
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
          ) : isEmeraldMint ? (
            <span className="text-emerald-300 font-bold flex items-center gap-1">
              <span>Emerald</span>
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-200">Mint</span>
            </span>
          ) : (
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <span>Ocean</span>
              <span className="text-cyan-500">•</span>
              <span className="text-cyan-200">Cyan</span>
            </span>
          )}
        </span>

        {showDropdown && (
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${
              isGoldPink ? 'text-pink-600' : isEmeraldMint ? 'text-emerald-400' : 'text-cyan-400'
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
            className={`fixed sm:absolute inset-x-3 top-16 sm:inset-x-auto sm:right-0 sm:top-full mt-1.5 w-auto sm:w-88 max-w-sm rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-xl ${
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
              <Palette className={`w-3.5 h-3.5 ${isGoldPink ? 'text-pink-600' : isEmeraldMint ? 'text-emerald-400' : 'text-cyan-400'}`} />
              <span>Appearance Theme</span>
            </div>
            <span className="text-[10px] font-mono opacity-60">3 Themes</span>
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
                        : item.id === 'emerald-mint'
                        ? 'bg-emerald-950/50 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                        : 'bg-cyan-950/50 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                      : isGoldPink
                      ? 'bg-slate-50/70 border-slate-200 hover:bg-pink-50/50 hover:border-pink-200'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Visual Swatch */}
                    <div
                      className={`w-9 h-9 rounded-xl ${item.swatchBg} p-0.5 border ${item.borderRing} flex items-center justify-center shrink-0 shadow-md group-hover/item:scale-105 transition-transform`}
                    >
                      {item.id === 'gold-pink' ? (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center shadow-inner">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      ) : item.id === 'emerald-mint' ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/80 flex items-center justify-center">
                          <Leaf className="w-2.5 h-2.5 text-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-cyan-500/80 flex items-center justify-center">
                          <Waves className="w-2.5 h-2.5 text-white" />
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
                                : item.id === 'emerald-mint'
                                ? 'text-emerald-300 font-extrabold'
                                : 'text-cyan-300 font-extrabold'
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
                              : item.id === 'emerald-mint'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
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
                          : item.id === 'emerald-mint'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-cyan-600 text-white'
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
            <span>Quick Cycle</span>
            <button
              type="button"
              onClick={toggleTheme}
              className={`font-semibold transition-colors ${
                isGoldPink ? 'text-pink-600 hover:text-pink-700' : isEmeraldMint ? 'text-emerald-400 hover:text-emerald-300' : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              Next theme (1-click)
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
