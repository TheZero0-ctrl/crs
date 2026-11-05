import { describe, expect, it } from 'vitest';
import { createExample, exampleGeometry, exercises, checkExercise, geometryTypes, positionsOf, initialLine, formatGeoJson, type ExampleOptions } from '../src/geo/geojson-examples';
import { geoJsonMap } from '../src/visuals/geojson-map';
import { geoJsonChapters } from '../src/geojson-lessons';

const options: ExampleOptions = { point: { longitude: 126.978, latitude: 37.5665 }, height: 30, geometry: 'Point', hole: true, split: true, name: 'Seoul' };

describe('GeoJSON teaching examples', () => {
  it('keeps longitude first and height separate from properties', () => {
    expect(createExample('height', options)).toEqual({ type: 'Point', coordinates: [126.978, 37.5665, 30] });
    expect(createExample('feature', options)).toMatchObject({ type: 'Feature', geometry: { coordinates: [126.978, 37.5665] }, properties: { name: 'Seoul' } });
  });
  it('shows each position on one line without changing geometry or property strings', () => {
    for (const geometry of geometryTypes) {
      const example = exampleGeometry({ ...options, geometry });
      expect(JSON.parse(formatGeoJson(example))).toEqual(example);
    }
    const example = createExample('feature', { ...options, name: '[1,  2]\n[3,  4]' });
    const formatted = formatGeoJson(example);
    expect(formatted).toContain('[126.978, 37.5665]');
    expect(JSON.parse(formatted)).toEqual(example);
  });
  it('uses closed rings with counterclockwise exteriors and clockwise holes', () => {
    const polygon = exampleGeometry({ ...options, geometry: 'Polygon' });
    if (polygon.type !== 'Polygon') throw new Error('Expected a polygon');
    const areas = polygon.coordinates.map(ring => {
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring.at(-1));
      return ring.slice(1).reduce((sum, point, i) => sum + ring[i][0] * point[1] - point[0] * ring[i][1], 0) / 2;
    });
    expect(areas[0]).toBeGreaterThan(0);
    expect(areas[1]).toBeLessThan(0);
  });
  it('draws every geometry type with finite coordinates in either display', () => {
    for (const geometry of geometryTypes) {
      const example = exampleGeometry({ ...options, geometry });
      expect(positionsOf(example).length).toBeGreaterThan(0);
      for (const mercator of [false, true]) expect(geoJsonMap(example, mercator)).not.toMatch(/NaN|Infinity/);
    }
  });
  it('handles poles and boundary longitude without nonfinite SVG paths', () => {
    for (const longitude of [-180, 180]) for (const latitude of [-90, 90]) {
      const example = createExample('point', { ...options, point: { longitude, latitude } });
      const markup = geoJsonMap(example, true);
      expect(markup).not.toMatch(/NaN|Infinity/);
      expect(markup).toContain('Mercator excludes the poles');
    }
  });
  it('splits crossing lines so no piece spans more than 180 degrees', () => {
    const example = createExample('antimeridian', options);
    if (example.type !== 'MultiLineString') throw new Error('Expected multipart line');
    for (const line of example.coordinates) expect(Math.abs(line[1][0] - line[0][0])).toBe(10);
    expect(example.coordinates[0].at(-1)).toEqual([180, 45]);
    expect(example.coordinates[1][0]).toEqual([-180, 45]);
  });
  it('rejects each broken exercise and accepts each repair regardless of object member order', () => {
    exercises.forEach((exercise, index) => {
      expect(checkExercise(JSON.stringify(exercise.broken), index)).toBeTruthy();
      expect(checkExercise(JSON.stringify({ coordinates: exercise.solution.coordinates, type: exercise.solution.type }), index)).toBeNull();
    });
    expect(checkExercise('null', 0)).toBeTruthy();
    expect(checkExercise('{', 0)).toBeTruthy();
  });
  it('keeps every chapter linked to its RFC section and its own valid check', () => {
    expect(new Set(geoJsonChapters.map(c => c.id)).size).toBe(6);
    for (const chapter of geoJsonChapters) {
      expect(chapter.quiz.options[chapter.quiz.answer]).toBeTruthy();
      for (const step of chapter.steps) expect(step.section).toMatch(/^\d/);
    }
  });
  it('recomputes bounds after an extreme vertex moves and keeps default examples independent', () => {
    const line = initialLine();
    line[1] = [128, 38.5];
    const example = createExample('bbox', { ...options, line });
    expect(example.bbox).toEqual([126.7, 37.3, 128, 38.5]);
    expect(createExample('bbox', options).bbox).toEqual([126.7, 37.3, 127.4, 37.7]);
  });
  it('keeps resized polygon holes inside closed, correctly wound exteriors at slider limits', () => {
    for (const polygonScale of [.5, 1.5]) for (const holeScale of [.4, 1.5]) {
      const example = exampleGeometry({ ...options, geometry: 'Polygon', polygonScale, holeScale });
      if (example.type !== 'Polygon') throw new Error('Expected a polygon');
      const [outer, inner] = example.coordinates;
      expect(outer[0]).toEqual(outer.at(-1));
      expect(inner[0]).toEqual(inner.at(-1));
      const west = Math.min(...outer.map(p => p[0])), east = Math.max(...outer.map(p => p[0]));
      const south = Math.min(...outer.map(p => p[1])), north = Math.max(...outer.map(p => p[1]));
      for (const [lon, lat] of inner) {
        expect(lon).toBeGreaterThan(west); expect(lon).toBeLessThan(east);
        expect(lat).toBeGreaterThan(south); expect(lat).toBeLessThan(north);
      }
      const area = (ring: number[][]) => ring.slice(1).reduce((sum, point, i) => sum + ring[i][0] * point[1] - point[0] * ring[i][1], 0);
      expect(area(outer)).toBeGreaterThan(0); expect(area(inner)).toBeLessThan(0);
    }
  });
  it('moves antimeridian endpoints without changing their latitude or losing either boundary', () => {
    const example = createExample('antimeridian', { ...options, crossing: { west: 177, east: -178, latitude: -18 } });
    if (example.type !== 'MultiLineString') throw new Error('Expected a multipart line');
    expect(example.coordinates).toEqual([[[177, -18], [180, -18]], [[-180, -18], [-178, -18]]]);
    expect(example.bbox).toEqual([177, -18, -178, -18]);
    expect(geoJsonMap(example, false, true)).not.toMatch(/NaN|Infinity/);
  });
});
