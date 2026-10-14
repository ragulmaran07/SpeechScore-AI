import {
  Recording,
  Evaluation,
  EvaluationDetail,
  Rubric,
  DatasetAnnotation,
  DashboardStats
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Stats
  async getOverviewStats(): Promise<DashboardStats> {
    const res = await fetch(`${BASE_URL}/evaluations/stats/overview`);
    if (!res.ok) throw new Error('Failed to load dashboard overview stats');
    return res.json();
  },

  // Recordings
  async getRecordings(): Promise<Recording[]> {
    const res = await fetch(`${BASE_URL}/recordings`);
    if (!res.ok) throw new Error('Failed to fetch recordings');
    return res.json();
  },

  async getRecording(id: string): Promise<Recording> {
    const res = await fetch(`${BASE_URL}/recordings/${id}`);
    if (!res.ok) throw new Error('Failed to fetch recording details');
    return res.json();
  },

  async uploadRecording(formData: FormData): Promise<Recording> {
    const res = await fetch(`${BASE_URL}/recordings/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Audio upload failed' }));
      throw new Error(err.detail || 'Audio upload failed');
    }
    return res.json();
  },

  getAudioUrl(recordingId: string): string {
    return `${BASE_URL}/recordings/${recordingId}/audio`;
  },

  // Evaluations
  async getEvaluations(params?: { category?: string; search?: string }): Promise<Evaluation[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`${BASE_URL}/evaluations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch evaluations');
    return res.json();
  },

  async getEvaluation(id: string): Promise<EvaluationDetail> {
    const res = await fetch(`${BASE_URL}/evaluations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch evaluation details');
    return res.json();
  },

  async createEvaluation(payload: {
    title: string;
    participant_id: string;
    category: string;
    transcript: string;
    reference_recording_id: string;
    participant_recording_id: string;
    rubric_id?: string;
    notes?: string;
  }): Promise<Evaluation> {
    const res = await fetch(`${BASE_URL}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Evaluation creation failed' }));
      throw new Error(err.detail || 'Evaluation creation failed');
    }
    return res.json();
  },

  async deleteEvaluation(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/evaluations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete evaluation');
  },

  getIssuesCsvUrl(evaluationId: string): string {
    return `${BASE_URL}/evaluations/${evaluationId}/issues/csv`;
  },

  // Rubrics
  async getRubrics(): Promise<Rubric[]> {
    const res = await fetch(`${BASE_URL}/rubrics`);
    if (!res.ok) throw new Error('Failed to fetch rubrics');
    return res.json();
  },

  async updateRubric(id: string, payload: { name: string; is_default: boolean; weights: any; thresholds: any }): Promise<Rubric> {
    const res = await fetch(`${BASE_URL}/rubrics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update rubric' }));
      throw new Error(err.detail || 'Failed to update rubric');
    }
    return res.json();
  },

  // Contrastive Dataset Lab
  async getDataset(params?: { split?: string; delivery_label?: string; flaw_category?: string; search?: string }): Promise<DatasetAnnotation[]> {
    const query = new URLSearchParams();
    if (params?.split) query.append('split', params.split);
    if (params?.delivery_label) query.append('delivery_label', params.delivery_label);
    if (params?.flaw_category) query.append('flaw_category', params.flaw_category);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`${BASE_URL}/dataset?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch dataset annotations');
    return res.json();
  },

  async createDatasetAnnotation(payload: Partial<DatasetAnnotation>): Promise<DatasetAnnotation> {
    const res = await fetch(`${BASE_URL}/dataset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create dataset annotation');
    return res.json();
  },

  async updateDatasetAnnotation(id: string, payload: Partial<DatasetAnnotation>): Promise<DatasetAnnotation> {
    const res = await fetch(`${BASE_URL}/dataset/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update dataset annotation');
    return res.json();
  },

  async deleteDatasetAnnotation(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/dataset/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete annotation');
  },

  getDatasetCsvUrl(): string {
    return `${BASE_URL}/dataset/export/csv`;
  },

  getDatasetJsonUrl(): string {
    return `${BASE_URL}/dataset/export/json`;
  },

  async importDatasetJson(file: File): Promise<{ status: string; imported_count: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/dataset/import/json`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to import dataset JSON');
    return res.json();
  },

  // Settings & Diagnostics
  async getSettings(): Promise<any> {
    const res = await fetch(`${BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch system settings');
    return res.json();
  },

  async getHealth(): Promise<any> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Failed to connect to backend server');
    return res.json();
  }
};
