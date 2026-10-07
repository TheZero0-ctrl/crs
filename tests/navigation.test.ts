import { describe, expect, it } from 'vitest';
import { normalizePositions, resolvePosition } from '../src/navigation';

describe('lesson position resolution', () => {
  const positions = { foundations: { step: 2, quiz: false }, projections: { step: 2, quiz: true } };
  it('resumes each lesson independently, including a knowledge check', () => {
    expect(resolvePosition(0, positions)).toEqual({ step: 2, quiz: false });
    expect(resolvePosition(1, positions)).toEqual({ step: 2, quiz: true });
    expect(resolvePosition(2, positions)).toEqual({ step: 0, quiz: false });
  });
  it('prioritizes an explicitly bookmarked step over remembered progress', () => {
    expect(resolvePosition(1, positions, new URL('https://example.test/?lesson=projections&step=0'))).toEqual({ step: 0, quiz: false });
  });
  it('supports a direct knowledge-check bookmark and clearing it', () => {
    expect(resolvePosition(0, positions, new URL('https://example.test/?step=5&check=1'))).toEqual({ step: 5, quiz: true });
    expect(resolvePosition(1, positions, new URL('https://example.test/?check=0'))).toEqual({ step: 2, quiz: false });
  });
  it('migrates old step-only progress and rejects malformed bookmarked indices', () => {
    expect(resolvePosition(0, {}, undefined, 3)).toEqual({ step: 3, quiz: false });
    expect(resolvePosition(0, positions, new URL('https://example.test/?step=0.5'))).toEqual({ step: 0, quiz: false });
    expect(resolvePosition(0, positions, new URL('https://example.test/?step=999'))).toEqual({ step: 5, quiz: false });
  });
  it('sanitizes stored positions and ignores unknown chapters', () => {
    expect(normalizePositions(null)).toEqual({});
    expect(normalizePositions({ foundations: { step: -10, quiz: 'true' }, lab: { step: 999, quiz: true }, unknown: { step: 0 } })).toEqual({ foundations: { step: 0, quiz: false }, lab: { step: 2, quiz: true } });
  });
});
