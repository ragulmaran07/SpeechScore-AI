export interface Recording {
  id: string;
  title: string;
  speaker_id: string;
  transcript: string;
  audio_path: string;
  duration: float;
  sample_rate: number;
  source_notes?: string;
  consent_or_permission_notes?: string;
  created_at: string;
}

export type float = number;

export interface DetectedIssue {
  id: string;
  evaluation_id: string;
  start_time: number;
  end_time: number;
  category: string;
  severity: 'Minor' | 'Moderate' | 'Major' | 'Critical';
  measured_value: number;
  reference_value: number;
  deviation: number;
  explanation: string;
  recommendation: string;
  confidence_or_quality?: number;
}

export interface Rubric {
  id: string;
  name: string;
  is_default: boolean;
  weights: {
    pacing: number;
    pauses: number;
    pitch_variation: number;
    loudness_consistency: number;
    spectral_clarity: number;
    rhetorical_emphasis: number;
    [key: string]: number;
  };
  thresholds: {
    pacing_tolerance_pct: number;
    excessive_pause_sec: number;
    min_pause_sec: number;
    pitch_range_tolerance_hz: number;
    energy_burst_tolerance_db: number;
    [key: string]: number;
  };
  created_at: string;
}

export interface Evaluation {
  id: string;
  title: string;
  participant_id: string;
  category: string;
  transcript: string;
  reference_recording_id: string;
  participant_recording_id: string;
  rubric_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overall_score?: number;
  category_scores?: {
    pacing: number;
    pauses: number;
    pitch_variation: number;
    loudness_consistency: number;
    spectral_clarity: number;
    rhetorical_emphasis: number;
    [key: string]: number;
  };
  strengths?: string[];
  improvements?: string[];
  notes?: string;
  error_message?: string;
  created_at: string;
}

export interface TimeSeriesPoint {
  time: number;
  reference: number;
  participant: number;
  delta?: number;
}

export interface FeatureSummary {
  duration: number;
  speech_rate_wpm: number;
  articulation_rate_wpm: number;
  pause_count: number;
  total_pause_duration_sec: number;
  average_pause_sec: number;
  median_f0_hz: number;
  f0_std_hz: number;
  f0_range_hz: number;
  rms_energy_mean: number;
  rms_energy_std: number;
  spectral_centroid_mean: number;
}

export interface EvaluationDetail {
  evaluation: Evaluation;
  reference_recording: Recording;
  participant_recording: Recording;
  rubric: Rubric;
  issues: DetectedIssue[];
  feature_summaries: {
    reference: FeatureSummary;
    participant: FeatureSummary;
  };
  pitch_series: TimeSeriesPoint[];
  energy_series: TimeSeriesPoint[];
  speech_rate_windows: any[];
  pause_intervals: {
    reference: Array<{ start: number; end: number; duration: number }>;
    participant: Array<{ start: number; end: number; duration: number }>;
  };
  mfcc_comparison: {
    ref_mfcc_mean?: number[];
    part_mfcc_mean?: number[];
  };
}

export interface DatasetAnnotation {
  id: string;
  recording_id?: string;
  speech_title: string;
  transcript?: string;
  delivery_label: 'Ideal' | 'Slightly Flawed' | 'Moderately Flawed' | 'Severely Flawed';
  flaw_category: string;
  start_time: number;
  end_time: number;
  severity: 'Minor' | 'Moderate' | 'Major' | 'Critical';
  split: 'train' | 'validation' | 'test';
  speaker_id?: string;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  total_evaluations: number;
  average_overall_score: number;
  delivery_issues_identified: number;
  available_recordings: number;
  issue_distribution: Array<{ category: string; count: number }>;
  score_trend: Array<{ id: string; title: string; overall_score: number; created_at: string }>;
}
