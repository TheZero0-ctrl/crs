# Implementation notes

## Learning structure

The site is a guided field guide with five chapters and seventeen steps. The first chapter covers coordinate context, latitude, longitude, reference shape and datum, projection, and CRS meaning. Each chapter has a knowledge check. The course sidebar permits direct exploration without locking later chapters.

The active chapter and completed checks persist in localStorage. URL parameters take precedence for chapter and step. The selected geographic point is encoded as `lon` and `lat` for bookmarking. Invalid URL coordinates fall back to Greenwich in globe lessons or Seoul in projected lessons; invalid step values fall back to the first step.

The interface uses short topic names, one header Sources button, and Back/Next navigation. Decorative slogans, redundant source links, sharing, and coordinate-copy controls have been removed.

## Sub-lesson navigation

The desktop sidebar expands the current lesson into a named topic list. The clickable progress bars have been removed. Short labels live in `src/navigation.ts`; the original lesson headings, body text, and prompts remain in `src/lessons.ts`.

On viewports up to 900px wide, a native Topic select offers the same steps and the knowledge check. Current topics use `aria-current`, and navigation moves focus to the lesson content. Previous/Next controls remain fixed at the bottom; content padding and scroll padding reserve space so the controls do not cover the final content or focused answers.

Saved progress now includes a position per lesson, with the last teaching step and whether the knowledge check was open. Stored values are validated and clamped. Existing step-only progress is supported. Explicit URL step parameters override saved positions. `check=1` represents a direct check bookmark and is removed when returning to a topic.

Knowledge checks appear in a dedicated view without mounting a visualization. Previous returns to the last teaching step. A correct answer enables the next lesson. Answer selection is retained while switching lessons in the current session; a reload retains completion but asks the learner to answer again. Restart clears all saved positions and completion progress.

Verification after this navigation update: 36 tests passed, and TypeScript plus the production build passed. New tests cover named topic jumps, the mobile picker, per-lesson resume, explicit bookmark precedence, direct check navigation, Previous/Next boundaries, restart, and malformed stored positions.

## Visualization responsibilities

### World view

`src/visuals/world-view.ts` uses D3 geo to draw Natural Earth geometry, graticules, selected parallels and meridians, and the selected point in SVG.

- Dragging rotates the spherical view.
- Clicking inverts the projection to select a geographic point.
- Latitude/longitude fields and sliders provide a keyboard alternative.
- Center centres the globe on the selected location. Initial orientation follows the selected point.
- Equal Earth, Mercator, and equirectangular illustrate projection trade-offs.
- Equal-angular-radius circles illustrate local spherical distortion.
- The ellipsoid switch exaggerates flattening for explanation. This is not an ellipsoidal coordinate solver.

Worldwide presets include Greenwich, New Delhi, New York, Quito, Cape Town, Sydney, Tokyo, and Seoul. These examples cover both hemispheres and multiple continents. Korean presets remain separate so a worldwide example is not projected through a regional EPSG:5186 view.

### Korean projected map

`src/visuals/korea-map.ts` registers the EPSG:5186 definition through Proj4js and OpenLayers. The map's actual view coordinates are easting and northing in metres. Its 50 km grid is a projected-coordinate grid.

Regional Natural Earth polygons, labelled city examples, the 127°E meridian, the natural origin, and a central-belt bounding rectangle provide context without a network basemap. Remote global polygons are excluded before projection to avoid far-side Transverse Mercator geometry.

The marker can be dragged. Clicking selects a location. Coordinate forms offer an alternative input. The map supports keyboard panning and zooming when focused. Map module loading is guarded so a delayed import cannot attach to a previous lesson's visualization.

## Coordinate conventions

Named `GeographicPoint` and `ProjectedPoint` objects avoid assuming that X means easting. Arrays appear only at library boundaries or in explicitly labelled tuple demonstrations.

| CRS | Official EPSG order | Library convention used here |
| --- | --- | --- |
| EPSG:4326 | Latitude, longitude | Longitude, latitude |
| EPSG:5186 | Northing, easting | Easting, northing |

All coordinate calculations are in `src/geo/coordinates.ts`. The code validates finite values and latitude/longitude ranges. For EPSG:5186, it limits the educational lab to 120–135°E and 25–45°N, while displaying a separate note for locations outside the CRS's intended bounding box.

The registered projection parameters are:

```text
+proj=tmerc
+lat_0=38
+lon_0=127
+k=1
+x_0=200000
+y_0=600000
+ellps=GRS80
+towgs84=0,0,0
+units=m
+no_defs
```

The zero translation parameters represent the approximate datum relation associated with EPSG:15831. They are not a claim that KGD2002 and every WGS 84 realization are identical. The site explains the operation's approximately 1 m stated accuracy.

The false-offset switch changes only a labelled explanatory readout. It does not redefine EPSG:5186 or change the map projection.

The assign-versus-transform experiment intentionally interprets longitude and latitude numbers as easting and northing in metres, displays the incorrect location, and offers restoration of the original point.

## Independent coordinate verification

Reference values were obtained with the system PROJ implementation:

```sh
cs2cs -f '%.9f' EPSG:4326 EPSG:5186
```

This command uses authority axis order: input latitude, longitude and output northing, easting. The table below uses named fields instead.

| Point | Latitude | Longitude | Easting / m | Northing / m |
| --- | --- | --- | --- | --- |
| Seoul | 37.5665 | 126.9780 | 198056.366737027 | 551885.030588716 |
| Suwon | 37.2636 | 127.0286 | 202536.918902787 | 518267.697275920 |
| Daejeon | 36.3504 | 127.3845 | 234514.004263851 | 416994.467255809 |
| Jeju | 33.4996 | 126.5312 | 156437.519645526 | 100758.481493640 |
| Busan | 35.1796 | 129.0756 | 389076.803581329 | 288993.755992737 |
| Natural origin | 38 | 127 | 200000 | 600000 |

Tests compare Proj4js results against these references within 1 mm of numerical difference. Inverse tests start from these independently obtained projected coordinates rather than relying only on round trips.

## Checks performed

- `npm test`: coordinate and DOM-level interaction checks.
- `npm run build`: TypeScript and production build passed.
- Dependency installation audit: zero known vulnerabilities at implementation time.
- DOM-level interaction checks cover chapter navigation, invalid shared step input, projection selection, quizzes and completion, inverse coordinate entry, axis order, out-of-region input rejection, relabelling/restoration, source lists, and bundled documents.

The interaction tests use jsdom and a map test double. Browser canvas rendering, physical touch feel, mobile safe areas, and device keyboard behavior have not been tested on a real phone.

## Sources and bundled content

The Sources dialog exposes ten article/reference links and four video resources. It also includes the original project research documents as raw Markdown, with downloads, so those references remain accessible in the production build.

The geometric data and fonts are npm assets bundled locally. The site makes no basemap API request and needs no key. The QGIS extraction retains links to QGIS-hosted illustrations; opening the original sources or video resources requires internet access.

See [the build plan](build-plan.md), [research guide](epsg-4326-and-5186-resources.md), and [source attribution](README.md).
