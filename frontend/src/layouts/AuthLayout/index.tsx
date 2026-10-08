import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { useTheme } from '../../hooks';
import { ThemeToggle } from '../../components/common';

export const AuthLayout: React.FC = () => {
  const { isGoldPink } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-200 ${
        isGoldPink
          ? 'bg-gradient-to-br from-rose-50/90 via-amber-50/70 to-pink-50/80 text-slate-800'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top right floating theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background glow ambiance */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
          isGoldPink ? 'bg-amber-300/25' : 'bg-indigo-600/15'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-300 ${
          isGoldPink ? 'bg-pink-300/25' : 'bg-purple-600/10'
        }`}
      />

      {/* Main container */}
      <div className="w-full max-w-md relative z-10 space-y-5">
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 mb-1 ${
              isGoldPink
                ? 'bg-gradient-to-tr from-amber-400 via-pink-400 to-rose-500 shadow-pink-400/25 ring-1 ring-pink-200'
                : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-600/20'
            }`}
          >
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1
            className={`text-2xl font-bold tracking-tight transition-colors ${
              isGoldPink ? 'text-slate-900' : 'text-white'
            }`}
          >
            Smart Campus Optimizer
          </h1>
          <p
            className={`text-xs transition-colors ${
              isGoldPink ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Intelligent Laboratory & Resource Management
          </p>
        </div>

        <div
          className={`p-6 sm:p-7 rounded-2xl shadow-2xl transition-all duration-200 ${
            isGoldPink
              ? 'bg-white/95 border border-pink-200/90 shadow-2xl shadow-rose-900/10 ring-1 ring-pink-100/80 backdrop-blur-xl'
              : 'glass-panel shadow-2xl'
          }`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};
