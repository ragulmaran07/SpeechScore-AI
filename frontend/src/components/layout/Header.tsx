import React from 'react';
import { Menu, PlusCircle, Activity, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/overview')) return 'Forensics Dashboard Overview';
    if (pathname.startsWith('/evaluations/new')) return 'New Speech Evaluation';
    if (pathname.startsWith('/evaluations/')) return 'Evaluation Analytics & Ground Truth';
    if (pathname.startsWith('/comparison')) return 'Contrastive Comparison Studio';
    if (pathname.startsWith('/flaws')) return 'Detected Flaw Timeline';
    if (pathname.startsWith('/dataset')) return 'Contrastive Dataset Lab';
    if (pathname.startsWith('/history')) return 'Evaluation History & Audit';
    if (pathname.startsWith('/rubrics')) return 'Scoring Rubric Calibration';
    if (pathname.startsWith('/settings')) return 'System Diagnostics & Audio Settings';
    return 'EchoJudge AI — Speech Forensics';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-[#080d1a]/80 backdrop-blur-md border-b border-[#1e293b]">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Every Word. Every Moment. Measurable Improvement.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Real Audio DSP Pipeline</span>
        </div>

        <Link
          to="/evaluations/new"
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Evaluation</span>
        </Link>
      </div>
    </header>
  );
};
