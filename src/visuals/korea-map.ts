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
import { presets, type GeographicPoint, to5186 } from '../geo/coordinates';
import 'ol/ol.css';

export type KoreaMap = { update: (point: GeographicPoint, grid: boolean, offsets: boolean) => void; center: () => void; dispose: () => void };

export function mountKoreaMap(host: HTMLElement, point: GeographicPoint, onPoint: (point: GeographicPoint) => void): KoreaMap {
  host.tabIndex = 0;
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Interactive Korea map in EPSG:5186. Use arrow keys to pan, plus or minus to zoom, or the named coordinate forms to select a point.');
  register(proj4);
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
  const origin = new Feature({ geometry: new Point(projected([127, 38])), name: 'Natural origin · 38°N, 127°E' });
  const places = Object.entries(presets).filter(([name]) => name !== 'Natural origin').map(([name, p]) => new Feature({ geometry: new Point(projected([p.longitude, p.latitude])), name }));
  const cityStyle = (feature: Feature) => new Style({
    image: new CircleStyle({ radius: feature === origin ? 4 : 2.5, fill: new Fill({ color: feature === origin ? '#b65d32' : '#627367' }) }),
    text: new Text({ text: feature.get('name'), font: '12px "DM Sans", sans-serif', offsetY: -14, fill: new Fill({ color: '#425b50' }), stroke: new Stroke({ color: '#f0f4ec', width: 3 }) }),
  });
  const cities = new VectorLayer({ source: new VectorSource({ features: [...places, origin] }), style: feature => cityStyle(feature as Feature), declutter: true });
  const selected = new Feature(new Point([0, 0]));
  selected.setStyle(new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#b65d32' }), stroke: new Stroke({ color: '#fffefa', width: 3 }) }) }));
  const selection = new VectorLayer({ source: new VectorSource({ features: [selected] }) });
  const map = new Map({
    target: host, layers: [land, beltLayer, grid, axisLayer, cities, selection],
    controls: controls({ rotate: false, attribution: false }),
    view: new View({ projection: 'EPSG:5186', center: projected([127.5, 36.4]), resolution: 1550, minResolution: 50, maxResolution: 4500, extent: [-450000, -300000, 850000, 1200000] }),
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

  function update(next: GeographicPoint, showGrid: boolean) {
    current = next;
    try {
      const p = to5186(next);
      (selected.getGeometry() as Point).setCoordinates([p.easting, p.northing]);
    } catch { /* The app keeps the last valid marker when an input is rejected. */ }
    grid.setVisible(showGrid);
  }
  update(point, true);
  return {
    update(next, showGrid) { update(next, showGrid); },
    center() { const p = to5186(current); map.getView().setCenter([p.easting, p.northing]); },
    dispose() { observer.disconnect(); map.setTarget(undefined); map.dispose(); },
  };
}
