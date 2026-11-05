# Coordinate atlas

Interactive courses on coordinate reference systems and GeoJSON. Built with TypeScript, Vite, D3 geo, OpenLayers, and Proj4js.

The home page lists two independent courses:

- **Coordinate reference systems** covers latitude, longitude, projections, EPSG:4326, Korea's EPSG:5186, and coordinate transformations.
- **GeoJSON** covers geometry types, polygon rings and holes, Features, collections, CRS rules, bounding boxes, the antimeridian, and repair exercises. Examples link to RFC 7946, with additional references to GeoJSON.org and OpenLayers.

Use `?course=crs` or `?course=geojson` to resume a course. Existing links such as `?lesson=epsg&step=1` still open the CRS course. Chapters can be shared with `course`, `lesson`, and `step` parameters, with `check=1` for a knowledge check. The CRS connection chapter is `?course=geojson&lesson=geojson-crs`.

Progress stays on the current device. CRS retains its existing `atlas-progress` storage key; GeoJSON uses `atlas-geojson-progress`. Restarting a course does not reset the other. The GeoJSON exercise checks apply to the supplied examples, not arbitrary GeoJSON documents.

<img width="1425" height="1312" alt="image" src="https://github.com/user-attachments/assets/2eedb21d-9b45-4bef-9bfc-3a65d250c84b" />


## Run locally

Requires Node.js 22.12+ in the Node 22 release line, or Node.js 24+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build and test

```sh
npm test
npm run build
npm run preview
```

The production build uses `/crs/`. GitHub Actions deploys `dist/` to GitHub Pages on pushes to `main`.
