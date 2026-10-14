import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Activity,
  AlertTriangle,
  Mic2,
  PlusCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { api } from '../services/api';
import { DashboardStats, Evaluation } from '../types';

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvaluations, setRecentEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, evalsData] = await Promise.all([
          api.getOverviewStats(),
          api.getEvaluations()
        ]);
        setStats(statsData);
        setRecentEvaluations(evalsData.slice(0, 5));
      } catch (err: any) {
        setError(err.message || 'Failed to connect to backend forensics service.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs text-slate-400">Loading Forensics Dashboard Analytics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-white">Forensics Service Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1">{error || 'Could not retrieve database metrics.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Forensics Dashboard Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time aggregate data calculated from verified SQLite records and audio analyses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dataset"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Manage Dataset Lab</span>
          </Link>

          <Link
            to="/evaluations/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Evaluation</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Evaluations</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.total_evaluations}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Persisted in SQLite database</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Average Forensics Score</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.average_overall_score} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across evaluated oratory</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Delivery Issues Identified</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{stats.delivery_issues_identified}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Grounded with second timestamps</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Available Audio Recordings</span>
            <Mic2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.available_recordings}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Stored in local audio repository</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Distribution Bar Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">Delivery Flaw Category Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Frequency of acoustic flaws detected across saved performances.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.issue_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Issues Flagged" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score Progression Trend */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">Forensics Score Trajectory</h3>
          <p className="text-xs text-slate-400 mb-4">Overall 0–100 rubric performance scores across recent evaluations.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.score_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="title" stroke="#64748b" fontSize={10} tickFormatter={(t) => t.substring(0, 12) + '...'} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1120', borderColor: '#1e293b', borderRadius: '0.5rem', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="overall_score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Overall Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Evaluations Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Speech Evaluations</h3>
            <p className="text-xs text-slate-400">Jump directly into complete forensic reports and player scrubbers.</p>
          </div>
          <Link to="/history" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentEvaluations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No evaluations logged yet. Click "New Evaluation" to analyze your first speech!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Speech Title</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Participant ID</th>
                  <th className="px-4 py-2.5">Overall Score</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentEvaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white truncate max-w-xs">{ev.title}</td>
                    <td className="px-4 py-3 text-cyan-400">{ev.category}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{ev.participant_id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {ev.overall_score !== undefined ? `${ev.overall_score.toFixed(1)} / 100` : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/evaluations/${ev.id}`}
                        className="px-3 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Inspect Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
