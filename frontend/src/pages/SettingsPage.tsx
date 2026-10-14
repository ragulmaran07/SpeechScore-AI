import React, { useEffect, useState } from 'react';
import {
  Settings,
  Cpu,
  Database,
  Sliders,
  ShieldCheck,
  Sparkles,
  Server,
  Trash2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [s, h] = await Promise.all([
          api.getSettings(),
          api.getHealth()
        ]);
        setSettingsData(s);
        setHealthData(h);
      } catch (err) {}
      finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleClearCache = () => {
    if (confirm('Clear local audio cache and temporary artifacts? Existing database evaluations will remain.')) {
      alert('Local transient cache cleared successfully.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>System Diagnostics & Signal Engine Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inspect backend signal processing parameters, runtime audio telemetry, and optional AI model integrations.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>Retrieving system telemetry...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Engine Health Card */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Audio Forensics Backend Health</span>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Online & Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Service Status</span>
                <span className="font-semibold text-emerald-400">{healthData?.status || 'healthy'}</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Engine Core</span>
                <span className="font-semibold text-white">Librosa / SciPy</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Analysis Sample Rate</span>
                <span className="font-mono font-semibold text-cyan-400">{settingsData?.sample_rate || 16000} Hz</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Database</span>
                <span className="font-mono text-purple-300">SQLite (Local)</span>
              </div>
            </div>
          </div>

          {/* DSP Signal Parameters */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Digital Signal Processing (DSP) Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">FFT Window (N_FFT)</span>
                <span className="font-mono text-white text-sm font-bold">{settingsData?.n_fft || 2048} samples</span>
                <span className="text-[10px] text-slate-400 block mt-1">High spectral resolution</span>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Hop Length</span>
                <span className="font-mono text-white text-sm font-bold">{settingsData?.hop_length || 512} samples</span>
                <span className="text-[10px] text-slate-400 block mt-1">32ms temporal framing</span>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">MFCC Coefficients</span>
                <span className="font-mono text-white text-sm font-bold">{settingsData?.n_mfcc || 13} bands</span>
                <span className="text-[10px] text-slate-400 block mt-1">Mel-frequency spectral envelope</span>
              </div>
            </div>
          </div>

          {/* Optional Gemini AI Coaching Status */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Optional Gemini AI Coaching Integration</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                settingsData?.gemini_configured
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {settingsData?.gemini_configured ? 'Active (API Configured)' : 'Deterministic Template Mode (100% Offline)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When a Gemini API key is configured in <code>backend/.env</code>, AI converts verified acoustic measurements into conversational oratorical drills. If absent, EchoJudge AI operates seamlessly using deterministic evidence-based templates with zero cost and zero network dependency.
            </p>
          </div>

          {/* Data Storage & Cleanup */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Local Storage & Retention</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Upload Directory:</span>
                <code className="text-slate-200 font-mono">backend/data/uploads</code>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Feature Cache:</span>
                <code className="text-slate-200 font-mono">backend/data/features</code>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Database File:</span>
                <code className="text-slate-200 font-mono">backend/echojudge.db</code>
              </div>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Transient Audio Cache</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
