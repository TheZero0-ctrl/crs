# EPSG:4326 and EPSG:5186 learning resources

Researched on 2026-10-07. These are annotated links and original study notes, not copies of the linked publications. Publishers retain the rights to their material.

## Start with the difference

EPSG identifiers refer to records in a geodetic dataset. The dataset includes coordinate reference systems, datums, ellipsoids, coordinate operations, and other objects. An EPSG code is not simply a projection number.

| Property | EPSG:4326 | EPSG:5186 |
| --- | --- | --- |
| Name | WGS 84 | KGD2002 / Central Belt 2010 |
| CRS type | Geographic, two-dimensional | Projected, two-dimensional |
| Units | Degrees | Metres |
| Datum | World Geodetic System 1984 ensemble | Korean Geodetic Datum 2002 |
| Ellipsoid | WGS 84 | GRS 1980 |
| Map projection | None in the CRS definition | Transverse Mercator |
| Official axis order | Latitude, longitude | Northing, easting |
| Intended area | World | South Korea, onshore between 126°E and 128°E |
| Typical role | Exchanging geographic locations | Cadastre and topographic mapping in Korea's central belt |

Sources: [EPSG:4326 definition](https://epsg.io/4326) and [EPSG:5186 definition](https://epsg.io/5186). EPSG.io is a convenient viewer of EPSG data. [EPSG.org](https://epsg.org/home.html) is the authoritative registry maintained by IOGP.

Many software interfaces use longitude, latitude and easting, northing instead of the official axis order. Label coordinate fields explicitly and check the library's convention.

## Recommended reading order

1. Read the EPSG:4326 and EPSG:5186 definitions side by side.
2. Work through Ujaval Gandhi's QGIS projection tutorial.
3. Read OSGeo Korea's overview to distinguish 5186 from nearby Korean CRS codes.
4. Read PROJ's axis-order explanation.
5. Study Transverse Mercator and EPSG:5186's origin parameters.
6. Read the KGD2002-to-WGS-84 operation and Guidance Note 7-5 for accuracy and datum details.

## Articles and reference documentation

### 1. The EPSG Geodetic Parameter Dataset

- Publisher: IOGP.
- Link: https://epsg.org/home.html
- Level: Introductory reference.
- Why read it: Explains what EPSG records represent and who maintains the dataset. Use it to understand why a CRS identifier differs from a coordinate-operation identifier.

### 2. WGS 84, EPSG:4326

- Publisher: EPSG.io / MapTiler, using EPSG data.
- Link: https://epsg.io/4326
- Structured definition: https://epsg.io/4326.wkt2
- Level: Introductory to intermediate.
- Why read it: Shows the degree units, latitude-first axis order, global area of use, and WGS 84 datum ensemble. EPSG:4326 is two-dimensional; it does not define an altitude axis.

### 3. KGD2002 / Central Belt 2010, EPSG:5186

- Publisher: EPSG.io / MapTiler, using EPSG data sourced from Korea's National Geographic Information Institute.
- Link: https://epsg.io/5186
- Structured definition: https://epsg.io/5186.wkt2
- Level: Intermediate. This is the main reference for the website's Korean CRS lesson.
- Why read it: Contains the official projection parameters, northing-first axis order, area of use, and predecessor CRS codes. The record states that this CRS was legally mandated from 2010-01-01.

| Projection parameter | Value |
| --- | --- |
| Latitude of natural origin | 38°N |
| Longitude of natural origin / central meridian | 127°E |
| Scale factor at natural origin | 1 |
| False easting | 200,000 m |
| False northing | 600,000 m |

At the projection's natural origin in KGD2002, easting is 200,000 m and northing is 600,000 m. Official EPSG axis order writes this as northing, easting: `[600000, 200000]`. A conventional easting-first API writes `[200000, 600000]`.

The CRS area of use is the central belt, not all of South Korea. EPSG.io also shows the larger area of the selected datum transformation; do not confuse that transformation area with the CRS area in its WKT2 definition.

### 4. Korean CRS codes and PROJ parameters

- Original title: 한국 주요 좌표계 EPSG코드 및 proj4 인자 정리.
- Publisher: OSGeo Korea.
- Language: Korean.
- Link: https://www.osgeo.kr/17
- Published: 2011-12-21, with an update notice dated 2020-05-14.
- Level: Intermediate.
- Why read it: Compares Korean geographic, UTM, unified, and belt coordinate systems. Includes EPSG:4326, 5179, 5181, and 5186, plus historical Bessel-based systems.
- Reading note: This is a historical overview with legacy PROJ strings. Some prose labels omit a zero from false-northing values. Use the current EPSG definitions for parameters and modern operation selection.

### 5. Working with projections in QGIS

- Author: Ujaval Gandhi.
- Link: https://www.qgistutorials.com/en/docs/3/working_with_projections.html
- Language: English.
- Level: Beginner, hands-on.
- Why read it: Demonstrates layer CRS versus project CRS, reprojection, and overlaying layers that have different coordinate systems. Starts with EPSG:4326. Its projected example is British, but the workflow applies to Korean data using EPSG:5186.
- Try afterward: Load a Korean dataset with known CRS metadata, reproject it to 5186, and compare coordinate readouts while switching the project CRS.

### 6. PROJ FAQ, especially axis ordering

- Publisher: PROJ / OSGeo.
- Link: https://proj.org/en/stable/faq.html
- Axis-order section: https://proj.org/en/stable/faq.html#why-is-the-axis-ordering-in-proj-not-consistent
- Level: Intermediate.
- Why read it: Explains why official latitude-first definitions coexist with longitude-first software interfaces. Also explains why EPSG identifiers or WKT2 usually retain more CRS information than legacy PROJ strings.

### 7. Transverse Mercator

- Publisher: PROJ / OSGeo.
- Link: https://proj.org/en/stable/operations/projections/tmerc.html
- Level: Intermediate for the parameters, advanced for the formulas.
- Why read it: Explains the projection method used by EPSG:5186. Covers the central meridian, origin latitude, scale factor, false easting, and false northing. Transverse Mercator is conformal; it preserves local angles, not all distances or areas.

### 8. KGD2002 to WGS 84, operation EPSG:15831

- Publisher: EPSG.io / MapTiler, using EPSG data.
- Link: https://epsg.io/15831
- Level: Intermediate to advanced.
- Why read it: Shows the datum transformation commonly used between KGD2002 and WGS 84. The record describes an approximation at the +/- 1 m level, with zero geocentric translations. Zero parameters do not mean the datums are identical at every accuracy level.
- Connection to 5186: A typical 5186-to-4326 workflow first applies the inverse Transverse Mercator conversion to obtain KGD2002 geographic coordinates, then applies the datum transformation to WGS 84. The reverse workflow reverses those operations.

### 9. EPSG guidance notes

- Publisher: IOGP.
- Link: https://epsg.org/guidance-notes.html
- Level: Intermediate to advanced.
- Read Guidance Note 7-1, "Understanding the EPSG Dataset", for the structure and meaning of EPSG records.
- Read Guidance Note 7-2, "Coordinate conversions and transformations including formulas", for the mathematical definitions.
- Read Guidance Note 7-5, "EPSG null and copy transformations to WGS 84", for datum ensembles, approximate transformations, and limitations of EPSG:4326.
- The linked landing page provides the current download links for these publications.

### 10. Proj4js documentation

- Publisher: Proj4js project.
- Link: https://proj4js.org/
- Level: Intermediate, JavaScript implementation.
- Why read it: Useful for building a browser-based 4326-to-5186 coordinate converter. Describes custom CRS definitions and coordinate ordering.
- Default convention: Geographic arrays use `[longitude, latitude]`; projected arrays use conventional `[x, y]`, generally easting, northing. Authority axis ordering requires explicit handling.

## Videos

Video links below were found through publisher pages or search results. Titles and creators for the two English individual videos were checked with YouTube's metadata endpoint. The videos were not watched in full, so these are starting points rather than a technical review of every claim.

### 1. Coordinate system explained: geographic and projected CRS

- Creator: PSALM_GEO.
- Link: https://www.youtube.com/watch?v=GL833C2Gpn4
- Language: English.
- Level: Beginner.
- Why start here: The indexed description covers geographic systems including EPSG:4326, projected systems, and QGIS reprojection.

### 2. How to set coordinate reference system in QGIS

- Creator: 7StarTech.
- Link: https://www.youtube.com/watch?v=bnxO0tO5UBc
- Language: English.
- Level: Beginner, practical.
- Why watch: A QGIS CRS-setting demonstration. Pair it with the written reprojection tutorial so you understand the difference between assigning CRS metadata and changing coordinate values.

### 3. QGIS Cookbook, chapter 3: setting and understanding coordinate systems

- Original chapter label: 좌표계 설정 및 이해.
- Instructor credited by OSGeo Korea: Professor Kang Dong-jin, 강동진.
- Video: https://youtu.be/Ie3Dxek8jys
- Course source and other chapters: https://www.osgeo.kr/283
- Language: Korean.
- Level: Beginner to intermediate.
- Why watch: A Korean QGIS lesson on coordinate systems, linked directly by OSGeo Korea. The publisher page does not specify that it teaches EPSG:5186 specifically.

### 4. Dynamic coordinate reference systems

- Publisher: IOGP Geomatics Committee.
- Playlist: https://www.youtube.com/playlist?list=PLt0-qTVCvEp1ZwKnf8iup320Cvp9AgXso
- Source: https://epsg.org/guidance-notes.html
- Level: Advanced follow-up.
- Why watch: Introduces dynamic CRSs. Useful after learning basic 4326/5186 transformations, to understand why datum realizations and time matter for precise positioning.

### Searches for more EPSG:5186 lessons

I did not verify a dedicated EPSG:5186 video. These are search links, not recommendations for a specific video:

- [EPSG 5186 QGIS](https://www.youtube.com/results?search_query=EPSG+5186+QGIS)
- [Korean search: QGIS 중부원점 5186 좌표변환](https://www.youtube.com/results?search_query=QGIS+%EC%A4%91%EB%B6%80%EC%9B%90%EC%A0%90+5186+%EC%A2%8C%ED%91%9C%EB%B3%80%ED%99%98)
- [Korean search: 세계측지계 GRS80 좌표계](https://www.youtube.com/results?search_query=%EC%84%B8%EA%B3%84%EC%B8%A1%EC%A7%80%EA%B3%84+GRS80+%EC%A2%8C%ED%91%9C%EA%B3%84)

Useful Korean vocabulary: 좌표계 means coordinate system, 좌표변환 means coordinate transformation, 중부원점 refers to the central-belt origin, 세계측지계 means world geodetic system, and 국토지리정보원 is the National Geographic Information Institute.

## Interactive lesson ideas for this website

These are original suggestions based on the resources above.

1. **One location, two coordinate readouts.** Let the learner click a point near Seoul and see longitude/latitude in 4326 and easting/northing in 5186. Keep field names and units visible.
2. **Axis-order switch.** Toggle between official EPSG order and the library's array order. Swap the values deliberately and show how the resulting location changes.
3. **Projection origin and offsets.** Mark 127°E and 38°N. Show why the projected natural origin reads 200,000 m easting and 600,000 m northing rather than zero.
4. **Area-of-use overlay.** Highlight the 126°E to 128°E central belt. Distinguish the intended CRS extent from the larger region where software can calculate coordinates.
5. **Assign versus transform.** Show the result of relabelling unchanged coordinate numbers, then compare it with a real reprojection that preserves the location.
6. **Transformation stages.** Show WGS 84 geographic coordinates, the KGD2002 geographic stage, and the projected 5186 grid. Keep datum transformation separate from projection conversion.

Use real coordinate transformations for the readouts. A visual globe-to-plane illustration alone cannot produce correct EPSG:5186 coordinates.
