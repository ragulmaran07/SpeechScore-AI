import React from 'react';
import { DetectedIssue } from '../../types';
import { Play, AlertCircle, Clock, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface FlawTimelineProps {
  issues: DetectedIssue[];
  selectedIssueId?: string | null;
  onSelectIssue: (issue: DetectedIssue) => void;
  onJumpToAudio: (timestamp: number) => void;
}

export const FlawTimeline: React.FC<FlawTimelineProps> = ({
  issues,
  selectedIssueId,
  onSelectIssue,
  onJumpToAudio
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Major':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Moderate':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!issues || issues.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-white">No Significant Flaws Detected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          The evaluated delivery remained within all configured rubric tolerances for pacing, pause frequency, pitch modulation, and loudness consistency.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const isSelected = selectedIssueId === issue.id;

        return (
          <div
            key={issue.id}
            onClick={() => onSelectIssue(issue)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(issue.severity)}`}>
                  {issue.severity}
                </span>
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  {issue.category}
                </h4>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-mono text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <Clock className="w-3.5 h-3.5" />
                  {formatSecs(issue.start_time)} - {formatSecs(issue.end_time)} ({((issue.end_time - issue.start_time) || 0).toFixed(1)}s)
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToAudio(issue.start_time);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
                  title="Jump playback to this flaw timestamp"
                >
                  <Play className="w-3 h-3 ml-0.5" />
                  <span>Seek</span>
                </button>
              </div>
            </div>

            {/* Evidence Metrics */}
            <div className="grid grid-cols-3 gap-2 my-2.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 block">Measured Value:</span>
                <span className="font-semibold text-slate-200">{issue.measured_value}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Reference / Threshold:</span>
                <span className="font-semibold text-slate-200">{issue.reference_value}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Relative Deviation:</span>
                <span className="font-semibold text-amber-400">{issue.deviation > 0 ? `+${issue.deviation}` : issue.deviation}</span>
              </div>
            </div>

            {/* Explanation & Actionable Recommendation */}
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              {issue.explanation}
            </p>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
              <Zap className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-300 mr-1">Coaching Directive:</span>
                {issue.recommendation}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
