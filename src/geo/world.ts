import topology from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';

export const world = feature(
  topology as unknown as Topology,
  topology.objects.countries as unknown as GeometryCollection,
) as FeatureCollection;
