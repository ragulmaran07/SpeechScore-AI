import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  SplitSquareVertical,
  Clock,
  Database,
  History,
  Scale,
  Settings,
  Sparkles,
  Waves,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'New Evaluation', path: '/evaluations/new', icon: PlusCircle },
    { name: 'Comparison Studio', path: '/comparison', icon: SplitSquareVertical },
    { name: 'Flaw Timeline', path: '/flaws', icon: Clock },
    { name: 'Dataset Lab', path: '/dataset', icon: Database },
    { name: 'Evaluation History', path: '/history', icon: History },
    { name: 'Scoring Rubric', path: '/rubrics', icon: Scale },
    { name: 'Settings & Telemetry', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-[#0a0f1d] border-r border-[#1e293b] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e293b]">
          <NavLink to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                EchoJudge AI
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-cyan-400 font-medium">
                Speech Evaluator
              </span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Forensic Analytics
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Mode Action Box */}
        <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-200">Hackathon Demo Mode</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Inspect precomputed speech signal analysis and contrastive flaw evidence.
          </p>
          <NavLink
            to="/evaluations/eval-demo-collegiate-001"
            onClick={onClose}
            className="block w-full py-2 text-center text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md transition-colors"
          >
            Launch Sample Demo
          </NavLink>
        </div>

        {/* Sidebar Footer */}
        <div className="px-6 py-4 border-t border-[#1e293b] text-[11px] text-slate-400 flex items-center justify-between">
          <span>v1.0.0 (Vervathon)</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Signal Engine OK
          </span>
        </div>
      </aside>
    </>
  );
};
