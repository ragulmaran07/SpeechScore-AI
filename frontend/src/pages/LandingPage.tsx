import React from 'react';
import { Link } from 'react-router-dom';
import {
  Waves,
  ArrowRight,
  Play,
  Activity,
  Layers,
  Clock,
  Scale,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-20 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interdepartmental College Hackathon Showcase 2026</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Every Word. Every Moment.{' '}
          <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Measurable Improvement.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Analyze spoken performance using genuine audio signal processing, reference-based contrastive comparison, temporal flaw detection, and explainable rubric scoring.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/evaluations/new"
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>Start Speech Evaluation</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/evaluations/eval-demo-collegiate-001"
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all hover:border-slate-500 flex items-center justify-center gap-2 shadow-md"
          >
            <Play className="w-4 h-4 text-purple-400" />
            <span>Explore Hackathon Demo</span>
          </Link>
        </div>

        {/* Dual Audio Waveform Visual Representation with Flagged Delivery Issue */}
        <div className="mt-12 p-6 rounded-2xl bg-[#0c1326] border border-[#1e293b] shadow-2xl relative overflow-hidden text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-400" /> Contrastive Acoustic Waveform Alignment
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              DTW Synced (16 kHz)
            </span>
          </div>

          <div className="py-6 space-y-4 relative">
            {/* Reference Wave */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="text-blue-400 font-semibold">Reference Benchmark (Ideal Delivery)</span>
                <span>135 WPM • F0 145Hz</span>
              </div>
              <div className="h-10 bg-slate-950 rounded-lg p-1.5 flex items-center gap-1 overflow-hidden border border-blue-900/40">
                {Array.from({ length: 60 }).map((_, i) => {
                  const h = 20 + Math.sin(i * 0.4) * 15 + Math.cos(i * 0.8) * 8;
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-blue-500/80"
                      style={{ height: `${Math.max(4, h)}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Participant Wave with Flagged Region */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="text-purple-400 font-semibold">Participant Recording (Evaluated Delivery)</span>
                <span>175 WPM • Monotone Flat Pitch</span>
              </div>
              <div className="h-10 bg-slate-950 rounded-lg p-1.5 flex items-center gap-1 overflow-hidden border border-purple-900/40 relative">
                {Array.from({ length: 60 }).map((_, i) => {
                  const h = i > 25 && i < 38 ? 4 : 24 + Math.sin(i * 0.7) * 12;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full ${i > 25 && i < 38 ? 'bg-red-500' : 'bg-purple-500/80'}`}
                      style={{ height: `${Math.max(4, h)}px` }}
                    />
                  );
                })}

                {/* Flaw Highlight Box */}
                <div className="absolute left-[42%] w-[22%] h-full top-0 bg-red-500/20 border-x-2 border-red-500 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-red-300 bg-red-950 px-1 py-0.5 rounded shadow">
                    Flaw: 2.4s Awkward Silence
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Scientific Audio Signal Processing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Engineered using Librosa, NumPy, and SciPy for transparent, reproducible forensic evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Activity,
              title: 'Acoustic Feature Extraction',
              desc: 'Extract frame-level RMS energy, pitch (F0) contours via YIN autocorrelation, and 13-band MFCC spectral matrices.'
            },
            {
              icon: Layers,
              title: 'Contrastive Speech Comparison',
              desc: 'Dynamic Time Warping (DTW) temporally maps participant phrases to ideal reference benchmarks across speech windows.'
            },
            {
              icon: Clock,
              title: 'Timestamped Flaw Detection',
              desc: 'Identifies rapid rushing, awkward pauses, flat monotone pitch, and sudden volume bursts with exact second timestamps.'
            },
            {
              icon: Scale,
              title: 'Explainable Rubric Scoring',
              desc: 'Transparent 0–100 scale calibrated across pacing, fluency, pitch variation, loudness consistency, and rhetorical emphasis.'
            },
            {
              icon: Brain,
              title: 'Personalized Delivery Feedback',
              desc: 'Converts mathematical signal disparities into specific, physical oratorical practice drills and causal explanations.'
            },
            {
              icon: ShieldCheck,
              title: 'Interactive Forensic Dashboard',
              desc: 'Synchronized audio player scrubbing, interactive Recharts time series, and instant CSV/JSON report downloads.'
            }
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-cyan-500/40 transition-all hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2 tracking-tight">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Simple 5-Step Workflow */}
      <section className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0c1836] to-slate-900 border border-slate-800 text-center space-y-6">
        <h2 className="text-xl font-bold text-white">How EchoJudge AI Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Upload', desc: 'Upload WAV/FLAC audio for reference & participant.' },
            { step: '02', title: 'Analyze', desc: 'Preprocess mono 16 kHz stream & extract acoustic features.' },
            { step: '03', title: 'Compare', desc: 'DTW alignment computes reference-relative deviations.' },
            { step: '04', title: 'Explain', desc: 'Deterministic templates ground flaws in exact math.' },
            { step: '05', title: 'Improve', desc: 'Execute targeted coaching drills for collegiate oratory.' }
          ].map((s, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left">
              <span className="text-xs font-mono font-bold text-cyan-400">{s.step}</span>
              <h4 className="text-sm font-semibold text-white mt-1">{s.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Forensic Ethics & Methodology Note */}
      <section className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Forensics Methodology & Speaker Identity Ethics</span>
        </div>
        <p>
          Acoustic similarity does not automatically equal rhetorical excellence. Human speakers possess naturally different vocal registers, accents, and expressive timbres. EchoJudge AI evaluates rhetorical cadence, pacing consistency, pitch dynamic modulation, and pause appropriateness without penalizing an orator's native accent, physiological pitch, or personal vocal identity.
        </p>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-300">
          EchoJudge AI — Explainable Speech Performance Evaluator
        </p>
        <p>
          Built with React, TypeScript, FastAPI, Librosa, NumPy, and SciPy.
        </p>
        <p className="text-[11px] text-slate-400">
          Note: Automated AI forensics scores support, rather than replace, human collegiate forensics judges.
        </p>
      </footer>
    </div>
  );
};
