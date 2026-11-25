// Crop disease check: types, API calls and pure helpers.
import { api, request } from './api';
import type { Page } from './types';

export interface DiseaseCrop {
  id: string;
  name: string;
  conditions: string[];
}

export interface DiseaseModelInfo {
  available: boolean;
  version: string | null;
  crops: DiseaseCrop[];
  licence: string | null;
}

export interface ChemicalOption {
  active_ingredient: string;
  formulation: string;
  dose: string;
  source: { title: string; url: string };
}

export interface DiseaseInfo {
  crop: string;
  name: { en: string; hi: string; mr: string };
  type: string;
  pathogen: string | null;
  description: string;
  symptoms: string[];
  cultural: string[];
  chemical: ChemicalOption[];
  chemical_withheld: boolean;
  chemical_note: string;
  sources: Array<{ title: string; url: string }>;
}

export interface Candidate {
  class_id: string;
  condition: string;
  probability: number;
  info: DiseaseInfo | null;
}

export type CheckStatus = 'confident' | 'uncertain' | 'rejected';

export interface DiseaseCheck {
  id: number;
  crop: string;
  status: CheckStatus;
  reason: string | null;
  image_url: string;
  top3: Candidate[];
  model_version: string;
  consultation_id: number | null;
  created_at: string;
}

export const diseaseApi = {
  model: () => api.get<DiseaseModelInfo>('/disease/model'),
  history: (q: { limit: number; offset: number }) => api.get<Page<DiseaseCheck>>('/disease/checks', q),
  check: (file: File, crop: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('crop', crop);
    return request<DiseaseCheck>('/disease/checks', { method: 'POST', body: form });
  },
  askExpert: (id: number, note?: string) =>
    api.post<DiseaseCheck>(`/disease/checks/${id}/ask-expert`, { note: note || null }),
};

/** Disease name in the UI language, falling back to English, then to the class id. */
export function diseaseName(c: Pick<Candidate, 'condition' | 'info'>, lng: string | undefined): string {
  const names = c.info?.name;
  if (names) return (lng === 'hi' || lng === 'mr' ? names[lng] : undefined) || names.en;
  return c.condition.replace(/_/g, ' ');
}

export const percent = (p: number) => `${Math.round(p * 100)}%`;

/** Image path relative to the API, e.g. "/api/files/x.jpg" works with any VITE_API_BASE_URL. */
export function checkImageSrc(imageUrl: string, base: string): string {
  return imageUrl.startsWith('/api/') ? `${base}${imageUrl.slice(4)}` : imageUrl;
}

export const MAX_UPLOAD_MB = 8;
