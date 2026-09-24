import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common';
import { useAuth } from '../../hooks';

export const UnauthorizedPage: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-extrabold text-white">403 — Access Restricted</h1>
      <p className="text-sm text-slate-400 max-w-md mt-2 mb-6 leading-relaxed">
        Your current role (<strong className="text-indigo-400 uppercase">{role || 'unknown'}</strong>, user {user?.name}) does not have permission to view this administrative resource.
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
          onClick={() => navigate(`/${role || 'student'}/dashboard`)}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
