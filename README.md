# Coordinate atlas

An interactive field guide to coordinate reference systems. Built with vanilla TypeScript, with lessons that begin at latitude and longitude and lead into EPSG:4326 and Korea's EPSG:5186.

## Run locally

Use Node.js 22.12 or newer in the Node 22 release line, or a supported Node 24+ release.

```sh
npm install
npm run dev
```

Open the local address printed by Vite, normally http://localhost:5173.

The development server listens on all interfaces so you can open the machine's LAN address on a phone.

## Production build

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` folder to a static host. No backend, API key, external font request, or network basemap is required. Source links and videos open their original publishers' sites. This build assumes deployment at the host's root path.

## Lessons and interactions

1. **CRS basics.** Coordinate context, latitude, longitude, ellipsoid and datum, map projection, and CRS meaning.
2. **Projections.** Equal Earth, Mercator, and equirectangular comparisons; distortion circles; and longitude spacing.
3. **EPSG:4326.** EPSG records and the WGS 84 definition, with official versus API coordinate order.
4. **EPSG:5186.** A projected Korea map, central-belt extent, natural origin, false offsets, and CRS parameters.
5. **Coordinate lab.** Geographic/projected input, dragging the map marker, axis conventions, and assigning versus transforming.

Each chapter includes a knowledge check and technical explanations. Progress persists locally when browser storage is available. The URL retains the current lesson, step, and selected geographic point for bookmarking.

Globe lessons offer worldwide examples including Greenwich, New Delhi, New York, Quito, Cape Town, Sydney, Tokyo, and Seoul. EPSG:5186 lessons use Korean presets appropriate to the regional projection. Source access is consolidated in the header; the interface has no sharing or coordinate-copy buttons.

The Sources panel includes the researched articles, video links, and locally bundled Markdown documents with downloads.

## Lesson navigation

The active lesson expands in the desktop sidebar to show named sub-lessons and a knowledge check. On smaller screens, a Topic dropdown provides the same destinations. Short navigation labels are separate from the original teaching titles and explanations.

Previous/Next controls stay at the bottom of the viewport. A step label shows the current position. Each lesson remembers its last topic or check, including across reloads. Explicit URL parameters override remembered progress; `check=1` opens the knowledge check directly.

Checks have their own view. Previous returns to the last teaching step. A correct answer enables Next lesson. Restart clears remembered lesson positions and completion progress.

## Implementation

- Vite + TypeScript, HTML, and CSS.
- D3 geo for spherical illustrations and world projection comparisons.
- OpenLayers for the projected Korea map.
- Proj4js for numerical coordinate conversion.
- Natural Earth 1:110m geometry through world-atlas and topojson-client.
- Locally bundled DM Sans and DM Mono fonts.

```text
src/
  main.ts                   Application, lesson navigation, controls, sources
  lessons.ts                Lesson text, checks, article and video links
  navigation.ts             Topic labels, saved positions, bookmark resolution
  styles.css                Design tokens and responsive layouts
  geo/
    coordinates.ts          Validation, transformation, axis conventions
    world.ts                Bundled Natural Earth geometry
  visuals/
    world-view.ts           Interactive globe and projection illustrations
    korea-map.ts            EPSG:5186 map and point selection
tests/
  coordinates.test.ts       Independent PROJ reference checks
  lessons.test.ts           DOM-level lesson and input interaction checks
  navigation.test.ts        Resume, bookmarks, and stored-position validation
docs/
  build-plan.md
  implementation.md
  coordinate-reference-systems.md
  epsg-4326-and-5186-resources.md
```

## Verification

```sh
npm test
npm run build
```

The tests cover independent coordinate examples, inverse conversion, axis order, geographic input validation, area-of-use bounds, longitude spacing, worldwide and regional presets, lesson navigation, quizzes, relabelling, and resources.

The DOM-level lesson tests replace the OpenLayers map with a test double. They do not verify browser canvas rendering or real-device touch behavior. TypeScript compilation and the production build verify both visualization modules.

## Coordinate accuracy and geographic data

The 4326/5186 educational transformation uses the approximate KGD2002/WGS 84 relation in EPSG:15831. That datum operation has about 1 m stated accuracy. Numerical agreement between libraries does not imply equivalent real-world accuracy. The globe is a spherical illustration, and its exaggerated ellipsoid is not a survey model.

The Korean map uses a simplified geographic outline, not streets or cadastral boundaries. Its rectangle illustrates the CRS bounding box; the intended area is onshore South Korea within the central belt.

Natural Earth data are public domain. DM Sans and DM Mono use the SIL Open Font License. Original QGIS documentation attribution and licensing are recorded in [docs/README.md](docs/README.md).

See [the resource guide](docs/epsg-4326-and-5186-resources.md) and [implementation notes](docs/implementation.md) for the sources and technical decisions.
