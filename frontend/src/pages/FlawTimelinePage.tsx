import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, ExternalLink, Filter, Search, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Evaluation } from '../types';

export const FlawTimelinePage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const evals = await api.getEvaluations();
        setEvaluations(evals);
      } catch (err) {}
      finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span>Forensics Flaw Timeline Repository</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Chronological temporal flaw records flagged across speech deliveries using audio signal processing.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>Loading flaw timelines...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluations.map((ev) => (
            <div key={ev.id} className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    {ev.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">{ev.title}</h3>
                  <span className="text-xs text-slate-400">Speaker: {ev.participant_id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Overall Score</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {ev.overall_score !== undefined ? `${ev.overall_score.toFixed(1)} / 100` : 'N/A'}
                    </span>
                  </div>
                  <Link
                    to={`/evaluations/${ev.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <span>Inspect Flaw Timeline</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Directives Preview */}
              {ev.improvements && ev.improvements.length > 0 && (
                <div className="text-xs text-slate-300">
                  <span className="text-amber-400 font-semibold mr-1">Priority Flaws:</span>
                  {ev.improvements.join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
