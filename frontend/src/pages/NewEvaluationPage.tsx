import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  FileText,
  Sliders,
  Play,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { AudioUploader } from '../components/audio/AudioUploader';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { api } from '../services/api';
import { Recording, Rubric } from '../types';

export const NewEvaluationPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [category, setCategory] = useState('Persuasive Oratory');
  const [transcript, setTranscript] = useState(
    'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.'
  );
  const [notes, setNotes] = useState('');

  // Audio Recordings
  const [refRecording, setRefRecording] = useState<Recording | null>(null);
  const [partRecording, setPartRecording] = useState<Recording | null>(null);

  // Existing Recordings Selector option
  const [existingRecordings, setExistingRecordings] = useState<Recording[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>('default-collegiate-rubric');

  // Execution state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrerequisites() {
      try {
        const [recs, rubs] = await Promise.all([
          api.getRecordings(),
          api.getRubrics()
        ]);
        setExistingRecordings(recs);
        setRubrics(rubs);
        if (rubs.length > 0) {
          const def = rubs.find(r => r.is_default) || rubs[0];
          setSelectedRubricId(def.id);
        }
      } catch (err) {}
    }
    loadPrerequisites();
  }, []);

  const handleStartAnalysis = async () => {
    setError(null);

    if (!title.trim()) {
      setError('Please provide a speech title.');
      return;
    }
    if (!participantId.trim()) {
      setError('Please provide a participant name or ID.');
      return;
    }
    if (!transcript.trim()) {
      setError('Speech transcript cannot be empty.');
      return;
    }
    if (!refRecording) {
      setError('Please upload or select an Ideal Reference recording.');
      return;
    }
    if (!partRecording) {
      setError('Please upload or select a Participant recording.');
      return;
    }

    setAnalyzing(true);
    setAnalysisStage('Initiating audio decoding & 16 kHz resampler...');

    try {
      setTimeout(() => setAnalysisStage('Extracting pitch F0 contours, RMS energy, and 13-band MFCCs...'), 400);
      setTimeout(() => setAnalysisStage('Executing Dynamic Time Warping (DTW) sequence alignment...'), 900);
      setTimeout(() => setAnalysisStage('Applying contrastive flaw detection rules & rubric scoring...'), 1400);

      const created = await api.createEvaluation({
        title,
        participant_id: participantId,
        category,
        transcript,
        reference_recording_id: refRecording.id,
        participant_recording_id: partRecording.id,
        rubric_id: selectedRubricId,
        notes
      });

      // Navigate to results
      navigate(`/evaluations/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Signal processing analysis pipeline failed.');
      setAnalyzing(false);
    }
  };

  const useSampleSpeech = () => {
    setTitle('Collegiate Forensics Showcase: Gettysburg Address');
    setParticipantId('Speaker-204');
    setCategory('Persuasive Oratory');
    setTranscript(
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation or any nation so conceived and so dedicated, can long endure.'
    );
    // Find sample recordings if already present
    const ref = existingRecordings.find(r => r.id.includes('lincoln-ideal') || r.title.toLowerCase().includes('ideal') || r.title.toLowerCase().includes('benchmark'));
    const part = existingRecordings.find(r => r.id.includes('lincoln-flawed') || r.title.toLowerCase().includes('flawed') || r.title.toLowerCase().includes('practice'));
    if (ref) setRefRecording(ref);
    if (part) setPartRecording(part);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title & Preset Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">New Speech Evaluation</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure reference benchmark, participant audio, shared transcript, and forensic tolerances.
          </p>
        </div>
        <button
          onClick={useSampleSpeech}
          className="px-3.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 rounded-xl transition-colors"
        >
          Autofill Collegiate Sample Form
        </button>
      </div>

      {/* Form Container */}
      <div className="space-y-6">
        {/* Section A: Evaluation Details */}
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Section A: Speech Performance Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Speech Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Persuasive Oratory: The Ethics of Emerging Technology"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Participant ID / Name *</label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="e.g. Student #204 or Anonymous"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Forensics Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Persuasive Oratory">Persuasive Oratory</option>
                <option value="Interpretive Reading">Interpretive Reading</option>
                <option value="Declamation">Declamation</option>
                <option value="Extemporaneous Speaking">Extemporaneous Speaking</option>
                <option value="General Public Speaking">General Public Speaking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Scoring Rubric Standard</label>
              <select
                value={selectedRubricId}
                onChange={(e) => setSelectedRubricId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              >
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section B & C: Audio Uploaders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reference Audio */}
          <div className="space-y-3">
            <AudioUploader
              label="Ideal Reference Recording"
              role="reference"
              onUploaded={(rec) => setRefRecording(rec)}
              defaultTranscript={transcript}
            />
            {existingRecordings.length > 0 && !refRecording && (
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Or select existing:</span>
                <select
                  onChange={(e) => {
                    const r = existingRecordings.find(x => x.id === e.target.value);
                    if (r) setRefRecording(r);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
                >
                  <option value="">-- Choose saved benchmark --</option>
                  {existingRecordings.map(r => (
                    <option key={r.id} value={r.id}>{r.title} ({r.duration.toFixed(1)}s)</option>
                  ))}
                </select>
              </div>
            )}
            {refRecording && (
              <AudioPlayer
                title={refRecording.title}
                role="reference"
                src={api.getAudioUrl(refRecording.id)}
                duration={refRecording.duration}
              />
            )}
          </div>

          {/* Participant Audio */}
          <div className="space-y-3">
            <AudioUploader
              label="Participant Speech Recording"
              role="participant"
              onUploaded={(rec) => setPartRecording(rec)}
              defaultTranscript={transcript}
            />
            {existingRecordings.length > 0 && !partRecording && (
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Or select existing:</span>
                <select
                  onChange={(e) => {
                    const r = existingRecordings.find(x => x.id === e.target.value);
                    if (r) setPartRecording(r);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
                >
                  <option value="">-- Choose saved delivery --</option>
                  {existingRecordings.map(r => (
                    <option key={r.id} value={r.id}>{r.title} ({r.duration.toFixed(1)}s)</option>
                  ))}
                </select>
              </div>
            )}
            {partRecording && (
              <AudioPlayer
                title={partRecording.title}
                role="participant"
                src={api.getAudioUrl(partRecording.id)}
                duration={partRecording.duration}
              />
            )}
          </div>
        </div>

        {/* Section D: Shared Transcript */}
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Section D: Shared Transcript (Text Alignment Anchor)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Word Count: {transcript.trim().split(/\s+/).filter(Boolean).length}
            </span>
          </div>

          <textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Enter the speech transcript delivered by both speaker and reference..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
          />
          <p className="text-[11px] text-slate-400">
            A shared transcript allows word-level pacing calculation (WPM) and acoustic sequence alignment.
          </p>
        </div>

        {/* Section E: Notes */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <label className="block text-xs font-medium text-slate-400">Auditor Notes / Judge Feedback Instructions (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Focus on pacing acceleration during key oratorical climax."
            className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Action Button */}
        <button
          onClick={handleStartAnalysis}
          disabled={analyzing}
          className={`w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-3 shadow-xl transition-all ${
            analyzing
              ? 'bg-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-cyan-500/25 hover:scale-[1.01]'
          }`}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>{analysisStage}</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 ml-0.5 fill-current" />
              <span>Analyze Speech (Run DSP Forensics)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
