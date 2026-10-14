import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea
} from 'recharts';
import { TimeSeriesPoint, DetectedIssue } from '../../types';
import { Activity, Zap } from 'lucide-react';

interface PitchEnergyChartProps {
  pitchData: TimeSeriesPoint[];
  energyData: TimeSeriesPoint[];
  selectedIssue?: DetectedIssue | null;
  onTimeClick?: (time: number) => void;
}

export const PitchEnergyChart: React.FC<PitchEnergyChartProps> = ({
  pitchData,
  energyData,
  selectedIssue,
  onTimeClick
}) => {
  const [activeMetric, setActiveMetric] = useState<'pitch' | 'energy'>('pitch');

  const currentData = activeMetric === 'pitch' ? pitchData : energyData;
  const unit = activeMetric === 'pitch' ? 'Hz' : 'RMS (a.u.)';

  const formatTooltip = (val: any, name: any) => {
    if (val === undefined || val === null) return ['N/A', String(name)];
    return [`${val} ${unit}`, name === 'reference' ? 'Ideal Reference' : 'Participant'];
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-xl">
      {/* Chart Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Acoustic Signal Trajectories (DTW Aligned)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare fundamental frequency pitch contours and short-time acoustic energy dynamics.
          </p>
        </div>

        {/* Metric Toggle Tabs */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveMetric('pitch')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMetric === 'pitch'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>F0 Pitch Contour (Hz)</span>
          </button>
          <button
            onClick={() => setActiveMetric('energy')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMetric === 'energy'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>RMS Loudness Energy</span>
          </button>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={currentData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activeLabel !== undefined && onTimeClick) {
                onTimeClick(typeof e.activeLabel === 'number' ? e.activeLabel : parseFloat(String(e.activeLabel)));
              }
            }}
          >
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(t) => `${t}s`}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              domain={['auto', 'auto']}
              unit={activeMetric === 'pitch' ? ' Hz' : ''}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0b1120',
                borderColor: '#1e293b',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
              formatter={formatTooltip}
              labelFormatter={(l) => `Aligned Timestamp: ${l}s`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-300">
                  {value === 'reference' ? 'Reference (Ideal Forensics Benchmark)' : 'Participant (Evaluated Delivery)'}
                </span>
              )}
            />

            {/* Flagged Issue Interval Highlight */}
            {selectedIssue && (
              <ReferenceArea
                x1={selectedIssue.start_time}
                x2={selectedIssue.end_time}
                stroke="#ef4444"
                strokeOpacity={0.6}
                fill="#ef4444"
                fillOpacity={0.15}
                label={{
                  value: `${selectedIssue.category} (${selectedIssue.severity})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'top'
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="reference"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#38bdf8' }}
              name="reference"
            />
            <Line
              type="monotone"
              dataKey="participant"
              stroke="#c084fc"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#c084fc' }}
              name="participant"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
        <span>X-Axis: Aligned Time in Seconds</span>
        <span>Click on any chart coordinate to synchronize audio playback</span>
      </div>
    </div>
  );
};
