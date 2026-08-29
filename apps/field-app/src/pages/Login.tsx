import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Radio } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [officialId, setOfficialId] = useState('NER-OFFICER-01');
  const [password, setPassword] = useState('••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1: Mock authentication success
    navigate('/role-selection');
  };

  return (
    <div className="min-h-screen bg-command-bg flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Header Badge */}
      <div className="pt-8 text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-command-panel px-3 py-1.5 rounded-full border border-command-border shadow-lg">
          <ShieldCheck className="h-5 w-5 text-command-accent" />
          <span className="text-xs font-mono font-bold text-command-text tracking-wider uppercase">
            Govt of India • SIH Emergency Logistics
          </span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight uppercase pt-4">
          NER FIELD OPERATIONS
        </h1>
        <p className="text-xs text-command-muted font-medium">
          North Eastern Region Emergency Logistics
        </p>
      </div>

      {/* Login Form Card */}
      <form onSubmit={handleLogin} className="bg-command-panel border border-command-border p-6 rounded-2xl shadow-2xl space-y-5 my-auto">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            Official ID
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 h-4 w-4 text-command-muted" />
            <input
              type="text"
              value={officialId}
              onChange={(e) => setOfficialId(e.target.value)}
              className="w-full bg-command-bg border border-command-border rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:outline-none focus:border-command-accent transition-all"
              placeholder="Enter Official ID"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-command-muted uppercase tracking-wider block">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-command-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-command-bg border border-command-border rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white focus:outline-none focus:border-command-accent transition-all"
              placeholder="Enter Password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-command-accent hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm uppercase tracking-wider flex items-center justify-center space-x-2"
        >
          <span>LOGIN</span>
        </button>

        <div className="pt-2 text-center">
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            <Radio className="h-3 w-3 animate-ping" />
            <span>Demo Environment Active</span>
          </span>
        </div>
      </form>

      {/* Footer */}
      <div className="pb-4 text-center text-[10px] text-command-muted font-mono">
        Field Operations App v0.1.0 • Phase 1 Mobile Shell
      </div>
    </div>
  );
};
