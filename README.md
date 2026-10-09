# Coordinate atlas

An interactive guide to coordinate reference systems, map projections, EPSG:4326, and Korea's EPSG:5186. Built with TypeScript, Vite, D3 geo, OpenLayers, and Proj4js.

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
