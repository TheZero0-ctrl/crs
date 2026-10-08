import { describe, expect, it } from 'vitest';
import { angleGeometry, measurementDiagrams } from '../src/visuals/angle-measurements';

describe('latitude measurement geometry', () => {
  it.each([-90, -37.5665, 0, 37.5665, 90])('represents %s degrees from the equatorial plane', degrees => {
    const { center, endpoint } = angleGeometry(degrees, 'latitude');
    const reconstructed = Math.atan2(center[1] - endpoint[1], endpoint[0] - center[0]) * 180 / Math.PI;
    expect(reconstructed).toBeCloseTo(degrees, 8);
  });
  it('places the north and south poles at opposite ends of the meridian section', () => {
    expect(angleGeometry(90, 'latitude').endpoint[1]).toBeCloseTo(44, 8);
    expect(angleGeometry(-90, 'latitude').endpoint[1]).toBeCloseTo(176, 8);
    expect(angleGeometry(0, 'latitude').arc).toBe('');
  });
});

describe('longitude measurement geometry', () => {
  it.each([-180, -126.978, -90, 0, 90, 126.978, 180])('represents %s degrees from Greenwich in a North Pole view', degrees => {
    const { center, endpoint } = angleGeometry(degrees, 'longitude');
    const reconstructed = Math.atan2(center[0] - endpoint[0], center[1] - endpoint[1]) * 180 / Math.PI;
    expect(Math.abs(reconstructed)).toBeCloseTo(Math.abs(degrees), 8);
    if (Math.abs(degrees) < 180 && degrees !== 0) expect(Math.sign(reconstructed)).toBe(Math.sign(degrees));
  });
  it('draws east counterclockwise and west clockwise from the prime meridian', () => {
    expect(angleGeometry(90, 'longitude').endpoint[0]).toBeCloseTo(94, 8);
    expect(angleGeometry(-90, 'longitude').endpoint[0]).toBeCloseTo(226, 8);
    expect(angleGeometry(90, 'longitude').sweep).toBe(0);
    expect(angleGeometry(-90, 'longitude').sweep).toBe(1);
  });
  it('labels negative coordinates with the correct hemisphere and states the spherical approximation', () => {
    const markup = measurementDiagrams({ longitude: -74.006, latitude: -33.8688 }, 'both');
    expect(markup).toContain('33.87°S');
    expect(markup).toContain('74.01°W');
    expect(markup).toContain('sphere, not an ellipsoid');
    expect(markup).toContain('North Pole view');
  });
});
