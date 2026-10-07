import { lessons } from './lessons';

export type LessonPosition = { step: number; quiz: boolean };
export type LessonPositions = Record<string, LessonPosition>;

// Navigation labels stay separate from the original teaching titles and text.
export const topicLabels: Record<string, string[]> = {
  foundations: ['Coordinates', 'Latitude', 'Longitude', 'Ellipsoid & datum', 'Map projection', 'CRS summary'],
  projections: ['Distortion', 'Degrees & distance', 'Choosing a projection'],
  epsg: ['EPSG codes', 'WGS 84'],
  korea: ['Central belt', 'Origin & offsets', 'CRS definition'],
  lab: ['Conversion', 'Axis order', 'Assign vs. transform'],
};

export function safeIndex(value: unknown, count: number): number {
  return Number.isInteger(Number(value)) ? Math.max(0, Math.min(count - 1, Number(value))) : 0;
}

export function normalizePositions(value: unknown): LessonPositions {
  const result: LessonPositions = {};
  if (!value || typeof value !== 'object') return result;
  for (const lesson of lessons) {
    const position = (value as Record<string, unknown>)[lesson.id];
    if (!position || typeof position !== 'object') continue;
    const candidate = position as Partial<LessonPosition>;
    result[lesson.id] = { step: safeIndex(candidate.step, lesson.steps.length), quiz: candidate.quiz === true };
  }
  return result;
}

export function resolvePosition(lessonIndex: number, positions: LessonPositions, url?: URL, legacyStep?: unknown): LessonPosition {
  const lesson = lessons[lessonIndex];
  const remembered = positions[lesson.id] ?? { step: safeIndex(legacyStep ?? 0, lesson.steps.length), quiz: false };
  if (!url) return remembered;
  return {
    step: url.searchParams.has('step') ? safeIndex(url.searchParams.get('step'), lesson.steps.length) : remembered.step,
    quiz: url.searchParams.has('check') ? url.searchParams.get('check') === '1' : url.searchParams.has('step') ? false : remembered.quiz,
  };
}
