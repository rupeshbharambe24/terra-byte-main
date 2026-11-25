import { describe, expect, it } from 'vitest';
import { checkImageSrc, diseaseName, percent } from './disease';

const info = {
  crop: 'tomato',
  name: { en: 'Early blight', hi: 'अगेती झुलसा', mr: 'लवकर येणारा करपा' },
  type: 'fungal',
  pathogen: 'Alternaria solani',
  description: '',
  symptoms: [],
  cultural: [],
  chemical: [],
  chemical_withheld: false,
  chemical_note: '',
  sources: [],
};

describe('disease helpers', () => {
  it('names a disease in the UI language with fallbacks', () => {
    expect(diseaseName({ condition: 'early_blight', info }, 'mr')).toBe('लवकर येणारा करपा');
    expect(diseaseName({ condition: 'early_blight', info }, 'en')).toBe('Early blight');
    expect(diseaseName({ condition: 'leaf_mold', info: null }, 'hi')).toBe('leaf mold');
  });

  it('formats probabilities and image URLs', () => {
    expect(percent(0.874)).toBe('87%');
    expect(checkImageSrc('/api/files/images/u1/a.jpg', '/api')).toBe('/api/files/images/u1/a.jpg');
    expect(checkImageSrc('/api/files/x.jpg', 'https://api.example.org/api')).toBe('https://api.example.org/api/files/x.jpg');
  });
});
