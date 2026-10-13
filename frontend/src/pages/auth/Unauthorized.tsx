import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common';
import { useAuth } from '../../hooks';

export const UnauthorizedPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

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
            <span className="font-bold text-xs sm:text-sm tracking-tight text-[#0B1F3A] leading-tight block">
              Rajarambapu Institute of Technology
            </span>
            <p className="text-[10px] text-[#627D98] font-medium leading-tight hidden sm:block">
              Smart Campus Lab & Resource Optimizer
            </p>
          </div>
        </Link>
      </header>

      {/* Main error block */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#DC2626] mb-6 shadow-sm">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-widest px-3 py-1 rounded-full bg-rose-50 border border-rose-200 mb-2">
          Error 403
        </span>
        <h1 className="text-3xl font-extrabold text-[#0B1F3A]">Access Restricted</h1>
        <p className="text-sm text-[#627D98] max-w-md mt-2 mb-6 leading-relaxed">
          Your current verified account does not possess authorization clearance for this administrative resource.
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(role ? `/${role}/dashboard` : '/login')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
        </div>
      </main>

      {/* Academic footer */}
      <footer className="w-full border-t border-[#D9E2EC] bg-white py-3 px-4 text-center text-xs text-[#627D98]">
        © 2026 Rajarambapu Institute of Technology (RIT) • Authorization System
      </footer>
    </div>
  );
};
