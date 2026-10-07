# Coordinate atlas build plan

## Goal

Build a static, browser-based learning site in vanilla TypeScript. Begin with coordinates, latitude, longitude, reference shapes, and projections. Then teach EPSG identifiers, WGS 84 / EPSG:4326, KGD2002 / Central Belt 2010 / EPSG:5186, and coordinate transformation.

The user requested the full implementation in one pass. Use a guided Next/Back sequence with direct chapter navigation and a final coordinate playground.

## Design read

- Artifact: interactive educational atlas.
- Audience: beginners, with optional technical definitions for GIS users.
- Visual language: printed cartographic field guide combined with a coordinate instrument.
- Mode: greenfield. Preserve the research documents already in docs/.
- Visual variance: 5. Use an asymmetric lesson/sidebar layout and a dominant geographic illustration.
- Motion intensity: 2. Direct manipulation and short control feedback; no automatic rotation or decorative animation.
- Information density: 5. One concept per step, persistent coordinate readouts, optional technical detail.
- Asset dependence: 3. Real Natural Earth geographic geometry, with programmatic cartographic diagrams.
- Brand fidelity: 2. New identity, no existing brand assets.

## Design decisions

The narrative role is instruction and experimentation. Optimize for a laptop at reading distance and adapt to a phone. Keep the tone quiet, precise, and approachable. Each viewport contains a short explanation, one dominant diagram, and its controls.

- Paper: #f5f3ed; panel: #fffefa; ink: #233936.
- Geographic accent: #2f7068; projected/secondary accent: #b65d32.
- Typography: locally bundled DM Sans and DM Mono.
- Spacing: multiples of 4px, with 24px and 32px layout gaps.
- Radii: 8px controls, 16px visualization frames.
- Shadows: a restrained panel shadow only where useful.
- Motion: 120ms control feedback. Diagrams follow input immediately. Respect reduced motion.
- Touch: 44px targets, 16px inputs, safe-area padding, capability-gated hover, zoom remains enabled.

## Chapters

1. Foundations: why numbers need context; latitude; longitude; ellipsoid and datum; curved Earth to flat map; defining a CRS.
2. Projections: compare shapes; longitude spacing and distance; choose according to the task.
3. EPSG: registry identifiers; inspect EPSG:4326.
4. Korea's grid: central belt; natural origin and false offsets; inspect EPSG:5186.
5. Coordinate lab: transform geographic/projected coordinates; authority versus API axis order; assign versus transform.

Each chapter includes a knowledge check and a linked source. The sources panel links to the original documentation, the project's local research files, and the researched videos.

## Implementation

- Vite + TypeScript, no framework or backend.
- D3 geo for spherical globe and projection illustrations.
- OpenLayers for a real projected EPSG:5186 vector map.
- Proj4js for numerical coordinate conversion.
- world-atlas / Natural Earth 1:110m geographic geometry bundled locally through npm. The map is an educational outline, not a street map or survey dataset.
- Keep named longitude/latitude and easting/northing values internally. Adapt axis order at library boundaries.
- Use EPSG:15831's approximate KGD2002/WGS 84 relation for this educational conversion. Explain its approximately 1m accuracy and avoid claiming survey precision.
- Store chapter position and completed checks locally when storage is available. Share the selected point and lesson through URL parameters.
- No network basemap or API key is required.

## Research used for implementation

- D3 projection and inversion API: https://d3js.org/d3-geo/projection
- OpenLayers custom projection concepts: https://openlayers.org/en/latest/examples/wms-custom-proj.html
- Proj4js transformation and axis-order API: https://proj4js.org/
- CRS and datum-operation definitions: https://epsg.io/4326, https://epsg.io/5186, https://epsg.io/15831
- See epsg-4326-and-5186-resources.md for the annotated reading and video list.

## Verification

- Compile TypeScript and generate the production build.
- Compare coordinate examples with the system's PROJ implementation, not just round trips.
- Test coordinate validation, axis order, origin offsets, area-of-use boundaries, and invalid inputs.
- Inspect all chapters and controls for consistent state, accessibility labels, responsive layout, and meaningful source attribution.
- Real-device touch feel and mobile browser behavior require a phone check.
