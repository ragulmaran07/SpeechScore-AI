import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileAudio, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { Recording } from '../../types';

interface AudioUploaderProps {
  label: string;
  role: 'reference' | 'participant';
  onUploaded: (recording: Recording) => void;
  defaultTranscript?: string;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  label,
  role,
  onUploaded,
  defaultTranscript = ''
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [speakerId, setSpeakerId] = useState(role === 'reference' ? 'Benchmark Forensics Coach' : 'Speaker-01');
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [loading, setLoading] = useState(false);
  const [uploadedRecording, setUploadedRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an audio file (WAV, FLAC, or OGG).');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a recording title.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('speaker_id', speakerId);
    formData.append('transcript', transcript || 'Spoken presentation transcript');

    try {
      const rec = await api.uploadRecording(formData);
      setUploadedRecording(rec);
      onUploaded(rec);
    } catch (err: any) {
      setError(err.message || 'Audio upload and signal preprocessing failed');
    } finally {
      setLoading(false);
    }
  };

  const isReference = role === 'reference';

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isReference
        ? 'bg-[#0b1329] border-blue-500/25'
        : 'bg-[#120f29] border-purple-500/25'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
            isReference ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-300'
          }`}>
            {isReference ? 'Step A: Reference Recording' : 'Step B: Participant Recording'}
          </span>
          <h3 className="text-sm font-semibold text-white mt-1">{label}</h3>
        </div>
        {uploadedRecording && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified & Preprocessed
          </span>
        )}
      </div>

      {!uploadedRecording ? (
        <div className="space-y-4">
          {/* File Input Area */}
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all group">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-slate-200">
              {file ? file.name : 'Click or drop audio file here'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Supports WAV, FLAC, OGG (Uncompressed PCM recommended)
            </span>
            <input
              type="file"
              accept=".wav,.mp3,.ogg,.flac,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Recording Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lincoln Gettysburg - Master Benchmark"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Speaker / Participant ID
              </label>
              <input
                type="text"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                placeholder="e.g. Master Forensics Coach or Participant #402"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
              loading || !file
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isReference
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Decoding & Resampling Audio (16 kHz)...</span>
              </>
            ) : (
              <>
                <FileAudio className="w-4 h-4" />
                <span>Upload & Preprocess Audio</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Audio Title:</span>
            <span className="font-semibold text-slate-200">{uploadedRecording.title}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Duration:</span>
            <span className="font-mono text-cyan-400">{uploadedRecording.duration.toFixed(2)}s</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Normalized Sample Rate:</span>
            <span className="font-mono text-slate-300">{uploadedRecording.sample_rate} Hz Mono</span>
          </div>
          <button
            onClick={() => setUploadedRecording(null)}
            className="w-full mt-2 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Replace Audio File
          </button>
        </div>
      )}
    </div>
  );
};
