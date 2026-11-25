import { describe, expect, it } from 'vitest';
import { LANGUAGES, NAMESPACES, resources } from './resources';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

// Plural suffixes differ by language in theory; en/hi/mr all use _one/_other.
const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();

describe('locales', () => {
  for (const ns of NAMESPACES) {
    const en = flatten(resources.en[ns] as Tree);

    for (const lng of LANGUAGES.filter((l) => l !== 'en')) {
      const other = flatten(resources[lng][ns] as Tree);

      it(`${lng}/${ns} has exactly the English keys`, () => {
        expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
      });

      it(`${lng}/${ns} keeps the same {{placeholders}} and has no empty strings`, () => {
        for (const [key, value] of Object.entries(en)) {
          expect(other[key], `${lng}:${ns}:${key}`).toBeTruthy();
          expect(placeholders(other[key] ?? ''), `${lng}:${ns}:${key}`).toEqual(placeholders(value));
        }
      });
    }
  }

  it('Hindi and Marathi strings are written in Devanagari', () => {
    for (const lng of ['hi', 'mr'] as const) {
      const strings = Object.values(flatten(resources[lng].common as Tree));
      const devanagari = strings.filter((s) => /[ऀ-ॿ]/.test(s));
      // Brand names and language names may stay in Latin script; nearly everything else must not.
      expect(devanagari.length / strings.length).toBeGreaterThan(0.9);
    }
  });
});
