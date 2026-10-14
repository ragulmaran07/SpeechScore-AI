import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  title: string;
  role: 'reference' | 'participant';
  src: string;
  duration?: number;
  highlightInterval?: { start: number; end: number } | null;
  onTimeUpdate?: (currentTime: number) => void;
  seekTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title,
  role,
  src,
  duration: initialDuration = 0,
  highlightInterval,
  onTimeUpdate,
  seekTime
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, [seekTime]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    if (onTimeUpdate) onTimeUpdate(t);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isReference = role === 'reference';

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isReference 
        ? 'bg-slate-900/90 border-blue-500/30 shadow-lg shadow-blue-500/5'
        : 'bg-slate-900/90 border-purple-500/30 shadow-lg shadow-purple-500/5'
    }`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header Badge & Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 truncate">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isReference ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}>
            {isReference ? 'Reference Benchmark' : 'Participant Delivery'}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate">{title}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress & Scrubbing Bar */}
      <div className="relative mb-3">
        <input
          type="range"
          min={0}
          max={duration || 10}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        {/* Highlight Flagged Interval Overlay */}
        {highlightInterval && duration > 0 && (
          <div
            className="absolute top-0 h-1.5 bg-red-500/70 rounded pointer-events-none"
            style={{
              left: `${(highlightInterval.start / duration) * 100}%`,
              width: `${Math.max(2, ((highlightInterval.end - highlightInterval.start) / duration) * 100)}%`
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all shadow-md ${
              isReference
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Reset to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }
          }}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
