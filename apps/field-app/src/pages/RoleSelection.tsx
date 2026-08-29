import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Truck, Shield, ArrowRight } from 'lucide-react';

export const RoleSelection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-command-bg flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-6 text-center space-y-1">
        <span className="text-[10px] font-mono text-command-accent bg-command-accent/10 border border-command-accent/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Authentication Confirmed
        </span>
        <h1 className="text-xl font-black text-white tracking-tight uppercase pt-2">
          SELECT YOUR ROLE
        </h1>
        <p className="text-xs text-command-muted">
          Choose your active field operations persona
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="space-y-4 my-auto">
        {/* Field Officer Card */}
        <div
          onClick={() => navigate('/officer-dashboard')}
          className="bg-command-panel border border-command-border hover:border-command-accent p-5 rounded-2xl shadow-2xl cursor-pointer transition-all active:scale-[0.98] group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-command-accent/20 rounded-xl text-command-accent">
              <UserCheck size={28} />
            </div>
            <ArrowRight size={20} className="text-command-muted group-hover:text-command-accent transition-colors" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              FIELD OFFICER
            </h2>
            <p className="text-xs text-command-muted mt-1">
              Field observations, disaster impact monitoring, and local operations
            </p>
          </div>

          <div className="pt-2 border-t border-command-border/60 text-[11px] font-mono text-command-accent space-y-1">
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>Report incidents & observations</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>Submit field observations</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>Monitor assigned operations</span>
            </div>
          </div>
        </div>

        {/* Truck Driver Card */}
        <div
          onClick={() => navigate('/driver-dashboard')}
          className="bg-command-panel border border-command-border hover:border-amber-500 p-5 rounded-2xl shadow-2xl cursor-pointer transition-all active:scale-[0.98] group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
              <Truck size={28} />
            </div>
            <ArrowRight size={20} className="text-command-muted group-hover:text-amber-400 transition-colors" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              TRUCK DRIVER
            </h2>
            <p className="text-xs text-command-muted mt-1">
              Convoy navigation, trip management, and route hazard reporting
            </p>
          </div>

          <div className="pt-2 border-t border-command-border/60 text-[11px] font-mono text-amber-400 space-y-1">
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>Manage assigned trips</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>View route details</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield size={12} />
              <span>Report road problems</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-4 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-mono text-command-muted hover:text-white underline"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};
