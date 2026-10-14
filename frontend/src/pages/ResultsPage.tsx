import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  Share2,
  Printer,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { EvaluationDetail, DetectedIssue } from '../types';
import { ScoreCards } from '../components/evaluations/ScoreCards';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { PitchEnergyChart } from '../components/charts/PitchEnergyChart';
import { FlawTimeline } from '../components/evaluations/FlawTimeline';
import { SideBySideTable } from '../components/evaluations/SideBySideTable';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronized Playback & Inspection State
  const [selectedIssue, setSelectedIssue] = useState<DetectedIssue | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);

  useEffect(() => {
    async function loadEvaluation() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getEvaluation(id);
        setDetail(data);
        if (data.issues && data.issues.length > 0) {
          setSelectedIssue(data.issues[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve speech evaluation data.');
      } finally {
        setLoading(false);
      }
    }
    loadEvaluation();
  }, [id]);

  const handleJumpToTimestamp = (timestamp: number) => {
    setSeekTimestamp(timestamp);
  };

  const handleDownloadJson = () => {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echojudge_report_${detail.evaluation.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs text-slate-400">Loading Forensics Evaluation Analytics...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white">Evaluation Not Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">{error || 'Could not locate evaluation record.'}</p>
        <Link
          to="/overview"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const { evaluation, reference_recording, participant_recording, rubric, issues, feature_summaries } = detail;

  return (
    <div className="space-y-8">
      {/* A. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800">
              {evaluation.category}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {evaluation.id}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {evaluation.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1.5">
            <span>Speaker: <strong className="text-slate-200">{evaluation.participant_id}</strong></span>
            <span>•</span>
            <span>Date: {new Date(evaluation.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>Rubric: <strong className="text-slate-200">{rubric.name}</strong></span>
          </div>
        </div>

        {/* Export / Share Actions */}
        <div className="flex items-center gap-2">
          <a
            href={api.getIssuesCsvUrl(evaluation.id)}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
            title="Download CSV of detected flaws"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Flaws CSV</span>
          </a>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
            title="Download full analysis payload as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-400" />
            <span>Summary JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors"
            title="Print printable forensics report"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* B. Score Cards */}
      <ScoreCards
        overallScore={evaluation.overall_score || 0}
        categoryScores={evaluation.category_scores}
        issueCount={issues.length}
      />

      {/* C. Audio Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AudioPlayer
          title={reference_recording.title}
          role="reference"
          src={api.getAudioUrl(reference_recording.id)}
          duration={reference_recording.duration}
          seekTime={seekTimestamp}
        />
        <AudioPlayer
          title={participant_recording.title}
          role="participant"
          src={api.getAudioUrl(participant_recording.id)}
          duration={participant_recording.duration}
          highlightInterval={selectedIssue ? { start: selectedIssue.start_time, end: selectedIssue.end_time } : null}
          seekTime={seekTimestamp}
        />
      </div>

      {/* D. Time-Series Alignment Chart */}
      <PitchEnergyChart
        pitchData={detail.pitch_series}
        energyData={detail.energy_series}
        selectedIssue={selectedIssue}
        onTimeClick={handleJumpToTimestamp}
      />

      {/* Strengths & Priority Improvement Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Identified Rhetorical Strengths</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {evaluation.strengths?.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/25 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Priority Delivery Improvement Directives</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {evaluation.improvements?.map((imp, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* E & F. Detected Flaw Timeline & Explanations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Chronological Delivery Flaw Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any flagged interval to seek both audio players and inspect the mathematical evidence.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-400">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} flagged
          </span>
        </div>

        <FlawTimeline
          issues={issues}
          selectedIssueId={selectedIssue?.id}
          onSelectIssue={(iss) => {
            setSelectedIssue(iss);
            setSeekTimestamp(iss.start_time);
          }}
          onJumpToAudio={handleJumpToTimestamp}
        />
      </div>

      {/* Side by Side Acoustic Table */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white tracking-tight">
          Acoustic Parameter Contrast Matrix
        </h3>
        <SideBySideTable
          refSummary={feature_summaries.reference}
          partSummary={feature_summaries.participant}
        />
      </div>
    </div>
  );
};
