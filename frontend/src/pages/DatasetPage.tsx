import React, { useEffect, useState } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Layers,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { DatasetAnnotation } from '../types';

export const DatasetPage: React.FC = () => {
  const [annotations, setAnnotations] = useState<DatasetAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [splitFilter, setSplitFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');

  // New annotation modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTranscript, setNewTranscript] = useState('');
  const [newLabel, setNewLabel] = useState<'Ideal' | 'Slightly Flawed' | 'Moderately Flawed' | 'Severely Flawed'>('Moderately Flawed');
  const [newCategory, setNewCategory] = useState('Excessive speaking rate');
  const [newStartTime, setNewStartTime] = useState('0.0');
  const [newEndTime, setNewEndTime] = useState('5.0');
  const [newSeverity, setNewSeverity] = useState<'Minor' | 'Moderate' | 'Major' | 'Critical'>('Moderate');
  const [newSplit, setNewSplit] = useState<'train' | 'validation' | 'test'>('train');
  const [newSpeaker, setNewSpeaker] = useState('Speaker-01');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDataset();
  }, [splitFilter, labelFilter]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      const data = await api.getDataset({
        split: splitFilter || undefined,
        delivery_label: labelFilter || undefined,
        search: search || undefined
      });
      setAnnotations(data);
    } catch (err) {}
    finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDataset();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset annotation?')) return;
    try {
      await api.deleteDatasetAnnotation(id);
      setAnnotations(annotations.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete annotation.');
    }
  };

  const handleCreateAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.createDatasetAnnotation({
        speech_title: newTitle,
        transcript: newTranscript,
        delivery_label: newLabel,
        flaw_category: newCategory,
        start_time: parseFloat(newStartTime) || 0.0,
        end_time: parseFloat(newEndTime) || 5.0,
        severity: newSeverity,
        split: newSplit,
        speaker_id: newSpeaker,
        notes: newNotes
      });
      setAnnotations([created, ...annotations]);
      setShowAddModal(false);
      // Reset
      setNewTitle('');
      setNewTranscript('');
      setNewNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to add dataset annotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const res = await api.importDatasetJson(e.target.files[0]);
        alert(`Successfully imported ${res.imported_count} dataset annotations.`);
        loadDataset();
      } catch (err: any) {
        alert(err.message || 'Import failed.');
      }
    }
  };

  const getLabelBadge = (label: string) => {
    switch (label) {
      case 'Ideal':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Slightly Flawed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Moderately Flawed':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  const getSplitBadge = (split: string) => {
    switch (split) {
      case 'train':
        return 'bg-slate-800 text-slate-300';
      case 'validation':
        return 'bg-purple-900/40 text-purple-300 border border-purple-500/30';
      default:
        return 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Contrastive Dataset Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Curated repository of contrastive speech recordings, labelled delivery flaws, and temporal ground truth.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.getDatasetCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <a
            href={api.getDatasetJsonUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JSON</span>
          </a>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Add Annotation</span>
          </button>
        </div>
      </div>

      {/* Split Leakage Prevention Notice */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/25 flex items-start gap-3 text-xs text-slate-300">
        <Layers className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Strict Split Partitioning Active:</strong> Recordings derived from the same source speech are systematically assigned to the same split (train, validation, or test) to prevent rhetorical speech leakage during contrastive evaluation benchmarking.
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-[#0f172a] border border-[#1e293b]">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search speech title, notes, or transcript snippet..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={splitFilter}
            onChange={(e) => setSplitFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Splits</option>
            <option value="train">Train</option>
            <option value="validation">Validation</option>
            <option value="test">Test</option>
          </select>

          <select
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Quality Labels</option>
            <option value="Ideal">Ideal</option>
            <option value="Slightly Flawed">Slightly Flawed</option>
            <option value="Moderately Flawed">Moderately Flawed</option>
            <option value="Severely Flawed">Severely Flawed</option>
          </select>
        </div>
      </div>

      {/* Dataset Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>Loading dataset items...</span>
        </div>
      ) : annotations.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
          No dataset records matching filter criteria. Click "Add Annotation" to register a new ground truth speech item.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0f172a]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Speech Title</th>
                <th className="px-4 py-3">Quality Label</th>
                <th className="px-4 py-3">Flaw Category</th>
                <th className="px-4 py-3">Interval (sec)</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Split</th>
                <th className="px-4 py-3">Speaker ID</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {annotations.map((ann) => (
                <tr key={ann.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white block truncate max-w-xs">{ann.speech_title}</span>
                    <span className="text-[10px] text-slate-400 truncate block max-w-xs">{ann.notes || ann.transcript}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getLabelBadge(ann.delivery_label)}`}>
                      {ann.delivery_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cyan-300 font-medium">{ann.flaw_category}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {ann.start_time.toFixed(1)}s - {ann.end_time.toFixed(1)}s ({((ann.end_time - ann.start_time) || 0).toFixed(1)}s)
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-300">{ann.severity}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${getSplitBadge(ann.split)}`}>
                      {ann.split}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{ann.speaker_id || 'Anonymous'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete annotation record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Annotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight">Add Speech Annotation</h3>
            
            <form onSubmit={handleCreateAnnotation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Speech Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lincoln Gettysburg Address (Trial 2)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Delivery Quality Label *</label>
                  <select
                    value={newLabel}
                    onChange={(e: any) => setNewLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Ideal">Ideal</option>
                    <option value="Slightly Flawed">Slightly Flawed</option>
                    <option value="Moderately Flawed">Moderately Flawed</option>
                    <option value="Severely Flawed">Severely Flawed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Flaw Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Excessive speaking rate">Excessive speaking rate</option>
                    <option value="Slow or hesitant pacing">Slow or hesitant pacing</option>
                    <option value="Excessive pauses">Excessive pauses</option>
                    <option value="Insufficient pauses">Insufficient pauses</option>
                    <option value="Flat pitch variation">Flat pitch variation</option>
                    <option value="Excessive pitch fluctuation">Excessive pitch fluctuation</option>
                    <option value="Sudden loudness changes">Sudden loudness changes</option>
                    <option value="Low relative energy">Low relative energy</option>
                    <option value="Poorly timed emphasis">Poorly timed emphasis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Time (sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Time (sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e: any) => setNewSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Split</label>
                  <select
                    value={newSplit}
                    onChange={(e: any) => setNewSplit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="train">Train</option>
                    <option value="validation">Validation</option>
                    <option value="test">Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Speaker ID</label>
                  <input
                    type="text"
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Annotation Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Unintentional 2s silence caused by missing oratorical transition cue."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl"
                >
                  {submitting ? 'Saving...' : 'Save Annotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
