import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Download,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { Evaluation } from '../types';

export const HistoryPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadEvaluations();
  }, [categoryFilter]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const data = await api.getEvaluations({
        category: categoryFilter || undefined,
        search: search || undefined
      });
      setEvaluations(data);
    } catch (err) {}
    finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvaluations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this speech evaluation and its feature cache?')) return;
    try {
      await api.deleteEvaluation(id);
      setEvaluations(evaluations.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete evaluation.');
    }
  };

  const exportAllMetadata = () => {
    const blob = new Blob([JSON.stringify(evaluations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echojudge_evaluations_audit_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Evaluation History & Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and inspect verified oratorical evaluations persisted in the local SQLite database.
          </p>
        </div>

        <button
          onClick={exportAllMetadata}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export All History (JSON)</span>
        </button>
      </div>

      {/* Disclaimers */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span>
          Local Hackathon Storage: Evaluations are persisted locally in SQLite. Audio files reside in <code>backend/data/uploads</code>. Records are not isolated between users on a shared machine.
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-[#0f172a] border border-[#1e293b]">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by speech title or participant ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 w-full sm:w-auto"
        >
          <option value="">All Forensic Categories</option>
          <option value="Persuasive Oratory">Persuasive Oratory</option>
          <option value="Interpretive Reading">Interpretive Reading</option>
          <option value="Declamation">Declamation</option>
          <option value="Extemporaneous Speaking">Extemporaneous Speaking</option>
          <option value="General Public Speaking">General Public Speaking</option>
        </select>
      </div>

      {/* Evaluations Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>Loading evaluation records...</span>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
          No evaluations matching your search criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Speech Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Participant ID</th>
                <th className="px-4 py-3">Evaluation Date</th>
                <th className="px-4 py-3">Overall Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {evaluations.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link to={`/evaluations/${ev.id}`} className="hover:text-cyan-400 transition-colors">
                      {ev.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cyan-400">{ev.category}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{ev.participant_id}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {ev.overall_score !== undefined ? `${ev.overall_score.toFixed(1)} / 100` : 'Pending'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/evaluations/${ev.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-600 rounded-lg transition-colors border border-cyan-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Report</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
