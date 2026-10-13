import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#102A43] flex flex-col justify-between">
      {/* Top Academic Header with Official RIT Logo */}
      <header className="w-full border-b border-[#D9E2EC] bg-white px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 flex items-center justify-center shrink-0">
            <img
              src="/RIT.png"
              alt="RIT Logo"
              className="h-9 w-auto object-contain rounded-md shadow-2xs"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('assets')) {
                  target.src = '/src/assets/RIT.png';
                }
              }}
            />
          </div>
          <div className="border-l border-[#D9E2EC] pl-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-[#0B1F3A] leading-tight">
                Rajarambapu Institute of Technology
              </span>
            </div>
            <p className="text-[10px] text-[#627D98] font-medium leading-tight hidden sm:block">
              Smart Campus Lab & Resource Optimizer
            </p>
          </div>
        </Link>
        <div className="text-xs text-[#627D98] hidden md:block font-medium">
          Laboratory & Computing Resource Portal
        </div>
      </header>

      {/* Main content slot */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Academic footer */}
      <footer className="w-full border-t border-[#D9E2EC] bg-white py-3.5 px-4 text-center text-xs text-[#627D98]">
        © 2026 Rajarambapu Institute of Technology (RIT), Sakhrale • Smart Campus Optimization Platform
      </footer>
    </div>
  );
};
