import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Shield, Sparkles } from 'lucide-react';

interface HeaderProps {
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  projects: Array<{ id: string; name: string; code: string }>;
  onOpenAskProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedProjectId,
  setSelectedProjectId,
  projects,
  onOpenAskProject,
}) => {
  const { user, switchRole } = useAuth();

  const roleColors: Record<string, string> = {
    'Super Admin': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Builder Admin': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Normal User': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };

  const currentRoleColor = user ? (roleColors[user.role] || 'bg-slate-700 text-slate-300 border-slate-600') : '';

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Active Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 font-semibold cursor-pointer"
          >
            <option value="">All Projects (Consolidated)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenAskProject}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs font-semibold shadow-sm hover:from-indigo-500 hover:to-sky-500 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Ask Project</span>
        </button>
      </div>

      {/* User & Live RBAC Role Switcher */}
      <div className="flex items-center gap-4">
        {/* 2-Tier Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] text-slate-400">Current Role (RBAC):</span>
          <select
            value={user?.role === 'Builder Admin' ? 'Super Admin' : user?.role || 'Super Admin'}
            onChange={(e) => switchRole(e.target.value)}
            className="bg-slate-800 text-sky-300 text-xs rounded px-2.5 py-1 border border-slate-700 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="Super Admin">Super Admin (Full Admin Control)</option>
            <option value="Normal User">Normal User (Standard Operations)</option>
          </select>
        </div>

        {/* Current Active User Profile */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-sky-300">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${currentRoleColor}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
