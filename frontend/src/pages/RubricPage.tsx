import React, { useEffect, useState } from 'react';
import { Scale, Check, AlertCircle, Save, RotateCcw, Info, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Rubric } from '../types';

export const RubricPage: React.FC = () => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [weights, setWeights] = useState<any>({});
  const [thresholds, setThresholds] = useState<any>({});
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadRubrics();
  }, []);

  const loadRubrics = async () => {
    try {
      const data = await api.getRubrics();
      setRubrics(data);
      if (data.length > 0) {
        selectRubric(data[0]);
      }
    } catch (err) {}
  };

  const selectRubric = (r: Rubric) => {
    setSelectedRubric(r);
    setName(r.name);
    setWeights({ ...r.weights });
    setThresholds({ ...r.thresholds });
    setMessage(null);
  };

  const totalWeight = Object.values(weights).reduce((acc: number, val: any) => acc + (parseFloat(val) || 0), 0) as number;
  const isWeightValid = Math.abs(totalWeight - 100.0) < 0.1;

  const handleSave = async () => {
    if (!selectedRubric) return;
    if (!isWeightValid) {
      setMessage({ type: 'error', text: `Category weights must sum to exactly 100%. Current sum: ${totalWeight.toFixed(1)}%` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updated = await api.updateRubric(selectedRubric.id, {
        name,
        is_default: selectedRubric.is_default,
        weights,
        thresholds
      });
      setSelectedRubric(updated);
      setMessage({ type: 'success', text: 'Rubric weights and acoustic thresholds saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update rubric.' });
    } finally {
      setSaving(false);
    }
  };

  const resetToCollegiateStandard = () => {
    setWeights({
      pacing: 25.0,
      pauses: 20.0,
      pitch_variation: 20.0,
      loudness_consistency: 15.0,
      spectral_clarity: 10.0,
      rhetorical_emphasis: 10.0
    });
    setThresholds({
      pacing_tolerance_pct: 25.0,
      excessive_pause_sec: 1.8,
      min_pause_sec: 0.35,
      pitch_range_tolerance_hz: 40.0,
      energy_burst_tolerance_db: 10.0
    });
    setMessage({ type: 'success', text: 'Reset values to official Collegiate Forensic Oratory standard.' });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <span>Forensics Scoring Rubric Calibration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure transparent category weight allocations and threshold triggers for explainable 0–100 evaluations.
          </p>
        </div>

        <button
          onClick={resetToCollegiateStandard}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Collegiate Standard</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Rubric Name & Info */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Rubric Scheme Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-semibold"
          />
        </div>

        {/* Weights Calibration Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Category Weight Allocations (Total must equal 100%)
            </h3>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isWeightValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              Sum: {totalWeight.toFixed(1)}% {isWeightValid ? '✓' : '⚠️'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'pacing', label: 'Speaking Rate & Pacing (WPM)', desc: 'Tolerance against benchmark speech tempo' },
              { key: 'pauses', label: 'Pause Cadence & Fluency', desc: 'Penalties on prolonged silences & hesitations' },
              { key: 'pitch_variation', label: 'Vocal Variation & Pitch (F0)', desc: 'Evaluation of melodic range and pitch modulation' },
              { key: 'loudness_consistency', label: 'Loudness & Dynamics (RMS)', desc: 'Consistent projection and suppression of pops' },
              { key: 'spectral_clarity', label: 'Spectral Clarity & Resonance', desc: 'MFCC timbral envelope and harmonic clarity' },
              { key: 'rhetorical_emphasis', label: 'Oratorical Climax Emphasis', desc: 'Calibrated delivery of operative assertions' }
            ].map((cat) => (
              <div key={cat.key} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{cat.label}</span>
                  <span className="text-[10px] text-slate-400">{cat.desc}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={weights[cat.key] ?? 15}
                    onChange={(e) => setWeights({ ...weights, [cat.key]: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-center text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threshold Triggers */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Forensic Flaw Trigger Thresholds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Pacing Tolerance</span>
                <span className="text-[10px] text-slate-400">Deviation from reference speech rate</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={thresholds.pacing_tolerance_pct ?? 25}
                  onChange={(e) => setThresholds({ ...thresholds, pacing_tolerance_pct: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-center text-white font-mono"
                />
                <span className="text-slate-400">%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Excessive Pause Threshold</span>
                <span className="text-[10px] text-slate-400">Silence flagged as hesitation</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.excessive_pause_sec ?? 1.8}
                  onChange={(e) => setThresholds({ ...thresholds, excessive_pause_sec: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-center text-white font-mono"
                />
                <span className="text-slate-400">sec</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Pitch Range Floor</span>
                <span className="text-[10px] text-slate-400">Flagged as monotone if under</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={thresholds.pitch_range_tolerance_hz ?? 40}
                  onChange={(e) => setThresholds({ ...thresholds, pitch_range_tolerance_hz: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-center text-white font-mono"
                />
                <span className="text-slate-400">Hz</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Loudness Burst Tolerance</span>
                <span className="text-[10px] text-slate-400">RMS spike relative to baseline</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={thresholds.energy_burst_tolerance_db ?? 10}
                  onChange={(e) => setThresholds({ ...thresholds, energy_burst_tolerance_db: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-center text-white font-mono"
                />
                <span className="text-slate-400">dB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !isWeightValid}
          className={`w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
            saving || !isWeightValid
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Updating Rubric Calibration...' : 'Save Rubric Calibration'}</span>
        </button>
      </div>
    </div>
  );
};
