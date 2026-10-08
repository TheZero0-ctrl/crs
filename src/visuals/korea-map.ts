import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from 'ol/style';
import { register } from 'ol/proj/proj4';
import { transform } from 'ol/proj';
import { defaults as controls } from 'ol/control/defaults';
import Translate from 'ol/interaction/Translate';
import Collection from 'ol/Collection';
import proj4 from 'proj4';
import { world } from '../geo/world';
import { presets, type GeographicPoint, to5186, number } from '../geo/coordinates';
import { gridGuides, relabelledLocation } from '../geo/diagram-math';
import type { VisualFocus } from '../lesson-visuals';
import 'ol/ol.css';

export type KoreaMapOptions = { grid: boolean; offsets: boolean; focus: VisualFocus; official: boolean; comparison: GeographicPoint | null };
export type KoreaMap = { update: (point: GeographicPoint, options: KoreaMapOptions) => void; center: () => void; dispose: () => void };

export function mountKoreaMap(host: HTMLElement, point: GeographicPoint, onPoint: (point: GeographicPoint) => void): KoreaMap {
  host.tabIndex = 0;
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Interactive Korea map in EPSG:5186. Use arrow keys to pan, plus or minus to zoom, or the named coordinate forms to select a point.');
  register(proj4);
  let currentOptions: KoreaMapOptions = { grid: true, offsets: true, focus: 'belt', official: false, comparison: null };
  const projected = (coordinate: number[]) => transform(coordinate, 'EPSG:4326', 'EPSG:5186');
  // Avoid projecting far-side global polygons through a regional Transverse Mercator view.
  const regionalWorld = { ...world, features: world.features.filter(feature => ['156', '392', '410', '408', '158', '496'].includes(String(feature.id))) };
  const source = new VectorSource({ features: new GeoJSON().readFeatures(regionalWorld, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:5186' }), wrapX: false });
  const land = new VectorLayer({ source, style: new Style({ fill: new Fill({ color: '#e3e8dc' }), stroke: new Stroke({ color: '#adb9aa', width: 1.2 }) }) });
  const belt = new Feature(new Polygon([[[126, 33.14], [128, 33.14], [128, 38.33], [126, 38.33], [126, 33.14]].map(projected)]));
  const beltLayer = new VectorLayer({ source: new VectorSource({ features: [belt] }), style: new Style({ fill: new Fill({ color: 'rgba(47,112,104,.065)' }), stroke: new Stroke({ color: '#2f7068', width: 1.3, lineDash: [6, 6] }) }) });
  const gridFeatures: Feature[] = [];
  for (let e = -50000; e <= 450000; e += 50000) gridFeatures.push(new Feature(new LineString([[e, 50000], [e, 800000]])));
  for (let n = 50000; n <= 800000; n += 50000) gridFeatures.push(new Feature(new LineString([[-50000, n], [450000, n]])));
  const grid = new VectorLayer({ source: new VectorSource({ features: gridFeatures }), style: new Style({ stroke: new Stroke({ color: 'rgba(86,111,101,.2)', width: 1 }) }) });
  const meridian = new Feature(new LineString([[127, 32], [127, 40]].map(projected)));
  const axisLayer = new VectorLayer({ source: new VectorSource({ features: [meridian] }), style: new Style({ stroke: new Stroke({ color: '#b65d32', width: 1.4, lineDash: [8, 5] }) }) });
  const originAxes = new VectorLayer({ source: new VectorSource({ features: [new Feature(new LineString([[-50000, 600000], [450000, 600000]])), new Feature(new LineString([[200000, 50000], [200000, 800000]]))] }), style: new Style({ stroke: new Stroke({ color: '#2f7068', width: 1.3, lineDash: [4, 5] }) }) });
  const labels = [
    new Feature({ geometry: new Point(projected([126, 36.5])), name: '126°E · west limit' }),
    new Feature({ geometry: new Point(projected([128, 36.5])), name: '128°E · east limit' }),
    new Feature({ geometry: new Point(projected([127, 39])), name: '127°E · central meridian · k₀ = 1' }),
  ];
  const referenceLabels = new VectorLayer({ source: new VectorSource({ features: labels }), style: feature => new Style({ text: new Text({ text: feature.get('name'), font: '11px "DM Sans", sans-serif', fill: new Fill({ color: '#2f7068' }), stroke: new Stroke({ color: '#fffefa', width: 4 }), offsetY: -10 }) }) });
  const origin = new Feature({ geometry: new Point(projected([127, 38])), name: 'Natural origin · 38°N, 127°E' });
  const places = Object.entries(presets).filter(([name]) => name !== 'Natural origin').map(([name, p]) => new Feature({ geometry: new Point(projected([p.longitude, p.latitude])), name }));
  const cityStyle = (feature: Feature) => new Style({
    image: new CircleStyle({ radius: feature === origin ? ['origin', 'definition'].includes(currentOptions.focus) ? 8 : 4 : 2.5, fill: new Fill({ color: feature === origin ? '#b65d32' : '#627367' }), stroke: feature === origin ? new Stroke({ color: '#fffefa', width: 3 }) : undefined }),
    text: new Text({ text: feature.get('name'), font: '12px "DM Sans", sans-serif', offsetY: -14, fill: new Fill({ color: '#425b50' }), stroke: new Stroke({ color: '#f0f4ec', width: 3 }) }),
  });
  const cities = new VectorLayer({ source: new VectorSource({ features: [...places, origin] }), style: feature => cityStyle(feature as Feature), declutter: true });
  const selected = new Feature(new Point([0, 0]));
  selected.setStyle(new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#b65d32' }), stroke: new Stroke({ color: '#fffefa', width: 3 }) }) }));
  const selection = new VectorLayer({ source: new VectorSource({ features: [selected] }) });
  const guidesSource = new VectorSource();
  const guides = new VectorLayer({ source: guidesSource, style: feature => new Style({
    stroke: new Stroke({ color: feature.get('kind') === 'north' ? '#2f7068' : '#b65d32', width: 2.2, lineDash: feature.get('comparison') ? [5, 5] : undefined }),
    image: new CircleStyle({ radius: 7, fill: new Fill({ color: feature.get('correct') ? '#2f7068' : '#b65d32' }), stroke: new Stroke({ color: '#fffefa', width: 3 }) }),
    text: new Text({ text: feature.get('name') ?? '', font: '11px "DM Sans", sans-serif', fill: new Fill({ color: feature.get('kind') === 'north' ? '#2f7068' : '#b65d32' }), stroke: new Stroke({ color: '#fffefa', width: 4 }), offsetY: -13 }),
  }) });
  const map = new Map({
    target: host, layers: [land, beltLayer, grid, axisLayer, originAxes, referenceLabels, cities, selection, guides],
    controls: controls({ rotate: false, attribution: false }),
    view: new View({ projection: 'EPSG:5186', enableRotation: false, center: projected([127.5, 36.4]), resolution: 1550, minResolution: 50, maxResolution: 4500, extent: [-1500000, -1800000, 1800000, 1800000] }),
  });
  const drag = new Translate({ features: new Collection([selected]) });
  map.addInteraction(drag);
  let current = point;
  const sendCoordinate = (coordinate: number[]) => {
    const [longitude, latitude] = transform(coordinate, 'EPSG:5186', 'EPSG:4326');
    onPoint({ longitude, latitude });
  };
  map.on('singleclick', event => sendCoordinate(event.coordinate));
  drag.on('translateend', () => sendCoordinate((selected.getGeometry() as Point).getCoordinates()));
  const observer = new ResizeObserver(() => map.updateSize());
  observer.observe(host);
  const directionKey = document.createElement('div');
  directionKey.className = 'map-directions';
  directionKey.setAttribute('aria-label', 'Grid north points up. East points right.');
  directionKey.innerHTML = '<span class="north-direction">↑ Northing increases</span><span class="east-direction">Easting increases →</span>';
  host.append(directionKey);
  let comparisonFramed = false;

  function update(next: GeographicPoint, nextOptions: KoreaMapOptions) {
    current = next;
    currentOptions = nextOptions;
    host.dataset.focus = nextOptions.focus;
    guidesSource.clear();
    try {
      const p = to5186(next);
      (selected.getGeometry() as Point).setCoordinates([p.easting, p.northing]);
      selected.set('name', `E ${number(p.easting, 0)} m / N ${number(p.northing, 0)} m`);
      const atOrigin = nextOptions.focus === 'origin' && Math.abs(p.easting - 200000) < .01 && Math.abs(p.northing - 600000) < .01;
      selected.setStyle(new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: nextOptions.focus === 'assign' && !nextOptions.comparison ? '#2f7068' : '#b65d32' }), stroke: new Stroke({ color: '#fffefa', width: 3 }) }), text: new Text({ text: nextOptions.focus === 'assign' ? nextOptions.comparison ? 'Relabelled' : 'Correct' : atOrigin ? '' : selected.get('name'), font: '11px "DM Sans", sans-serif', offsetY: -18, fill: new Fill({ color: '#425b50' }), stroke: new Stroke({ color: '#fffefa', width: 4 }) }) }));
      if (nextOptions.focus === 'origin') {
        const g = gridGuides(next);
        const easting = new Feature({ geometry: new LineString([g.origin, g.corner]), name: `ΔE ${number(g.deltaE, 0)} m`, kind: 'east' });
        const northing = new Feature({ geometry: new LineString([g.corner, g.point]), name: `ΔN ${number(g.deltaN, 0)} m`, kind: 'north' });
        if (Math.abs(g.deltaE) >= .01) guidesSource.addFeature(easting);
        if (Math.abs(g.deltaN) >= .01) guidesSource.addFeature(northing);
      }
      if (nextOptions.focus === 'assign') {
        const correct = nextOptions.comparison ?? next;
        const wrong = relabelledLocation(correct);
        const correctXY = to5186(correct), wrongXY = to5186(wrong);
        const alternate = nextOptions.comparison ? correctXY : wrongXY;
        const alternatePoint = new Feature({ geometry: new Point([alternate.easting, alternate.northing]), name: nextOptions.comparison ? 'Correct' : 'Relabelled', correct: !!nextOptions.comparison, kind: nextOptions.comparison ? 'north' : 'east' });
        const connector = new Feature({ geometry: new LineString([[correctXY.easting, correctXY.northing], [wrongXY.easting, wrongXY.northing]]), comparison: true });
        guidesSource.addFeatures([connector, alternatePoint]);
        if (!comparisonFramed) {
          map.getView().fit(connector.getGeometry()!.getExtent(), { padding: [55, 70, 55, 70], maxZoom: 7 });
          comparisonFramed = true;
        }
      }
    } catch { /* The app keeps the last valid marker when an input is rejected. */ }
    grid.setVisible(nextOptions.grid);
    beltLayer.setOpacity(nextOptions.focus === 'belt' ? 1 : .35);
    axisLayer.setOpacity(['origin', 'definition'].includes(nextOptions.focus) ? 1 : .4);
    originAxes.setVisible(nextOptions.focus === 'origin');
    referenceLabels.setVisible(['belt', 'definition'].includes(nextOptions.focus));
    directionKey.hidden = !['origin', 'definition', 'axes', 'transform'].includes(nextOptions.focus);
    cities.changed();
  }
  update(point, currentOptions);
  return {
    update(next, nextOptions) { update(next, nextOptions); },
    center() { const p = to5186(current); map.getView().setCenter([p.easting, p.northing]); },
    dispose() { observer.disconnect(); directionKey.remove(); map.setTarget(undefined); map.dispose(); },
  };
}
