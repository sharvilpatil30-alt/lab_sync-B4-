import React from 'react';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common';
import { useAuth } from '../../hooks';

export const NotFoundPage: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    } else if (role === 'faculty') {
      navigate('/faculty/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
        <Compass className="w-12 h-12" />
      </div>
      <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-2">
        Error 404
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
        Campus Resource Not Found
      </h1>
      <p className="text-sm text-slate-400 max-w-md mt-2 mb-6 leading-relaxed">
        The corridor, laboratory, or URL you are attempting to access does not exist on the Smart Campus platform or has been relocated.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          onClick={handleReturn}
          leftIcon={<Home className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
