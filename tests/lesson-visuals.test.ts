import { describe, expect, it } from 'vitest';
import { lessons } from '../src/lessons';
import { lessonVisuals } from '../src/lesson-visuals';
import { ellipsoidSection, gridGuides, longitudeInterval, relabelledLocation } from '../src/geo/diagram-math';
import { presets, to5186, toKGD2002 } from '../src/geo/coordinates';

describe('course visual coverage', () => {
  it('gives every teaching step a distinct visual focus and an observable cue', () => {
    for (const lesson of lessons) {
      expect(lessonVisuals[lesson.id]).toHaveLength(lesson.steps.length);
      for (const visual of lessonVisuals[lesson.id]) {
        expect(visual.label.length).toBeGreaterThan(0);
        expect(visual.cue.length).toBeGreaterThan(0);
      }
    }
    expect(new Set(Object.values(lessonVisuals).flat().map(visual => visual.focus)).size).toBe(17);
  });
});

describe('geodetic visual geometry', () => {
  it.each([-90, -45, 0, 45, 90])('places the %s-degree surface normal perpendicular to the exaggerated ellipsoid', latitude => {
    const { point: [x, y], normal: [nx, ny] } = ellipsoidSection(latitude);
    expect(x * x / 90 ** 2 + y * y / 72 ** 2).toBeCloseTo(1, 10);
    // The ellipse gradient is a perpendicular vector. The normal must be parallel to it.
    expect(nx * y / 72 ** 2 - ny * x / 90 ** 2).toBeCloseTo(0, 10);
    expect(Math.atan2(ny, nx) * 180 / Math.PI).toBeCloseTo(latitude, 8);
  });
  it('does not confuse geodetic latitude with the centre-to-point angle', () => {
    const { point: [x, y] } = ellipsoidSection(45);
    expect(Math.atan2(y, x) * 180 / Math.PI).not.toBeCloseTo(45, 1);
  });
  it.each([-180, -74, 126.978, 179.5, 180])('keeps a 1-degree interval inside the antimeridian limits at %s', longitude => {
    const interval = longitudeInterval({ longitude, latitude: 60 });
    expect(interval.end[0] - interval.start[0]).toBe(1);
    expect(interval.start[0]).toBeGreaterThanOrEqual(-180);
    expect(interval.end[0]).toBeLessThanOrEqual(180);
    expect(interval.start[1]).toBe(60);
    expect(interval.end[1]).toBe(60);
  });
});

describe('projected lesson evidence', () => {
  it('draws Seoul grid differences relative to the false origin, with the correct signs', () => {
    const guides = gridGuides(presets.Seoul);
    expect(guides.deltaE).toBeCloseTo(-1943.633262973, 3);
    expect(guides.deltaN).toBeCloseTo(-48114.969411284, 3);
    expect(guides.corner[1]).toBe(600000);
    expect(guides.corner[0]).toBe(guides.point[0]);
    expect(guides.origin).toEqual([200000, 600000]);
  });
  it('has zero grid differences at the natural origin', () => {
    const guides = gridGuides(presets['Natural origin']);
    expect(guides.deltaE).toBeCloseTo(0, 5);
    expect(guides.deltaN).toBeCloseTo(0, 5);
  });
  it('shows degree numbers reinterpreted as metres at a different location', () => {
    const wrong = relabelledLocation(presets.Seoul);
    const projected = to5186(wrong);
    expect(projected.easting).toBeCloseTo(presets.Seoul.longitude, 3);
    expect(projected.northing).toBeCloseTo(presets.Seoul.latitude, 3);
    expect(wrong.latitude).not.toBeCloseTo(presets.Seoul.latitude, 1);
  });
  it('makes the approximate geographic datum stage explicit without claiming a large shift', () => {
    const geographic = toKGD2002(presets.Seoul);
    expect(geographic.latitude).toBeCloseTo(presets.Seoul.latitude, 6);
    expect(geographic.longitude).toBeCloseTo(presets.Seoul.longitude, 6);
  });
});
