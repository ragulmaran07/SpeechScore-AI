import React from 'react';
import { FeatureSummary } from '../../types';
import { Check, AlertTriangle, Info } from 'lucide-react';

interface SideBySideTableProps {
  refSummary: FeatureSummary;
  partSummary: FeatureSummary;
}

export const SideBySideTable: React.FC<SideBySideTableProps> = ({
  refSummary,
  partSummary
}) => {
  const metrics = [
    {
      label: 'Speech Rate (Total Delivery)',
      unit: 'WPM',
      refVal: refSummary.speech_rate_wpm,
      partVal: partSummary.speech_rate_wpm,
      threshold: '±25%',
      isGood: Math.abs(partSummary.speech_rate_wpm - refSummary.speech_rate_wpm) / Math.max(1, refSummary.speech_rate_wpm) <= 0.25,
      notes: 'Pacing affects listener comprehension and rhetoric.'
    },
    {
      label: 'Articulation Rate (Phonation Time)',
      unit: 'WPM',
      refVal: refSummary.articulation_rate_wpm,
      partVal: partSummary.articulation_rate_wpm,
      threshold: '±20%',
      isGood: Math.abs(partSummary.articulation_rate_wpm - refSummary.articulation_rate_wpm) / Math.max(1, refSummary.articulation_rate_wpm) <= 0.20,
      notes: 'Calculated purely over active vocalization segments.'
    },
    {
      label: 'Pitch Range (F0 Dynamics)',
      unit: 'Hz',
      refVal: refSummary.f0_range_hz,
      partVal: partSummary.f0_range_hz,
      threshold: '> 35 Hz',
      isGood: partSummary.f0_range_hz >= 35.0,
      notes: 'Monotone pitch below 35Hz diminishes vocal expression.'
    },
    {
      label: 'Median Fundamental Frequency (F0)',
      unit: 'Hz',
      refVal: refSummary.median_f0_hz,
      partVal: partSummary.median_f0_hz,
      threshold: 'Speaker Dependent',
      isGood: true,
      notes: 'Natural physiological pitch identity; not penalized.'
    },
    {
      label: 'Pause Count',
      unit: 'pauses',
      refVal: refSummary.pause_count,
      partVal: partSummary.pause_count,
      threshold: 'Contextual',
      isGood: partSummary.pause_count <= refSummary.pause_count + 3,
      notes: 'Identified silences exceeding 0.35s.'
    },
    {
      label: 'Average Pause Duration',
      unit: 'sec',
      refVal: refSummary.average_pause_sec,
      partVal: partSummary.average_pause_sec,
      threshold: '< 1.80s',
      isGood: partSummary.average_pause_sec <= 1.8,
      notes: 'Pauses >1.8s perceived as hesitation or memory lapse.'
    },
    {
      label: 'Spectral Centroid (Vocal Brightness)',
      unit: 'Hz',
      refVal: refSummary.spectral_centroid_mean,
      partVal: partSummary.spectral_centroid_mean,
      threshold: '±30%',
      isGood: true,
      notes: 'Acoustic timbre and microphone frequency balance.'
    }
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
          <tr>
            <th className="px-4 py-3">Acoustic Feature</th>
            <th className="px-4 py-3">Reference (Ideal)</th>
            <th className="px-4 py-3">Participant</th>
            <th className="px-4 py-3">Delta / Difference</th>
            <th className="px-4 py-3">Configured Tolerance</th>
            <th className="px-4 py-3">Forensics Assessment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-300">
          {metrics.map((m, idx) => {
            const diff = m.partVal - m.refVal;
            const pct = m.refVal > 0 ? (diff / m.refVal) * 100 : 0;

            return (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-white">
                  {m.label}
                  <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{m.notes}</span>
                </td>
                <td className="px-4 py-3 font-mono text-cyan-400">
                  {m.refVal.toFixed(1)} {m.unit}
                </td>
                <td className="px-4 py-3 font-mono text-purple-300">
                  {m.partVal.toFixed(1)} {m.unit}
                </td>
                <td className="px-4 py-3 font-mono">
                  <span className={diff > 0 ? 'text-amber-400' : 'text-slate-300'}>
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {m.unit}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ({pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`})
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{m.threshold}</td>
                <td className="px-4 py-3">
                  {m.isGood ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Check className="w-3 h-3" /> Within Target
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      <AlertTriangle className="w-3 h-3" /> Flaw Flagged
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
