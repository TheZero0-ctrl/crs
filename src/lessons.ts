export type VisualMode = 'globe' | 'projection' | 'map';
export type Step = { title: string; body: string; prompt: string; takeaway: string; detail: string };
export type Lesson = {
  id: string; name: string; short: string; mode: VisualMode; source: string; sourceName: string;
  steps: Step[]; quiz: { question: string; options: string[]; answer: number; explanation: string };
};

export const lessons: Lesson[] = [
  {
    id: 'foundations', name: 'CRS basics', short: 'Foundations', mode: 'globe',
    source: 'https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/coordinate_reference_systems.html', sourceName: 'QGIS · A gentle introduction to GIS',
    steps: [
      { title: 'A place is more than two numbers.', body: '37.5665 and 126.9780 describe a location only when we know what the numbers mean. Are they angles? Distances? Which comes first? A coordinate reference system gives coordinates that context.', prompt: 'Click the globe to choose a place. Drag it to turn the Earth.', takeaway: 'Coordinates are values. A CRS tells us how to interpret them.', detail: 'A CRS combines a coordinate system with a reference framework. The system defines axes and units; the datum or reference frame connects it to the Earth. A projected CRS also includes a projection conversion.' },
      { title: 'Latitude tells us how far north.', body: 'Latitude is an angle north or south of the equator. The equator is 0°, the North Pole is +90°, and the South Pole is −90°. Lines of constant latitude are called parallels.', prompt: 'Move the latitude slider. Follow the teal parallel around the globe.', takeaway: 'Latitude is an angle in degrees, not a distance in metres.', detail: 'Geodetic latitude is the angle between the equatorial plane and the normal to the reference ellipsoid. Our globe is a spherical illustration; precise CRS calculations use the ellipsoid.' },
      { title: 'Longitude tells us how far east.', body: 'Longitude measures an angle east or west of the prime meridian at Greenwich. East is positive and west is negative. Longitude meridians meet at the poles.', prompt: 'Move the longitude slider. The orange meridian follows your point.', takeaway: 'Longitude runs from −180° to +180°. Both ends meet at the antimeridian.', detail: 'At the poles, all longitude meridians converge. A longitude interval therefore has a different ground length at different latitudes. The Greenwich prime meridian is part of both CRS definitions used here.' },
      { title: 'First, give the Earth a reference.', body: 'Earth is not a perfect sphere. An ellipsoid is a smooth, slightly flattened model of its shape. A datum or reference frame defines how that model is tied to the real Earth.', prompt: 'Switch between the spherical illustration and an exaggerated ellipsoid.', takeaway: 'The ellipsoid describes a shape. The datum connects coordinates to Earth.', detail: 'WGS 84 and GRS 1980 have almost identical ellipsoid dimensions, but an ellipsoid is not a datum. KGD2002 and WGS 84 have different reference-framework definitions. The flattening shown here is exaggerated; real flattening is about 1/298.' },
      { title: 'A curved surface. A flat map.', body: 'A map projection converts geographic positions into positions on a plane. It makes a flat map possible, but changes some combination of shape, area, distance, and direction.', prompt: 'Switch to the flat map, then choose another projection.', takeaway: 'A geographic CRS does not need a projection. A projected CRS does.', detail: 'The globe and flat maps use D3 spherical projections for illustration. They are not the ellipsoidal EPSG:5186 calculation. That calculation appears later in the coordinate lab.' },
      { title: 'That is a coordinate reference system.', body: 'A CRS makes coordinate values meaningful. Geographic systems use angular coordinates such as latitude and longitude. Projected systems add a map projection and usually express positions as easting and northing.', prompt: 'Explore another location and inspect its named coordinates on the right.', takeaway: 'Reference framework + axes + units, with a projection for a projected CRS.', detail: 'CRSs may have two or three dimensions. EPSG:4326 is a two-dimensional geographic CRS. EPSG:5186 is a two-dimensional projected CRS. Neither code by itself defines an elevation axis.' },
    ],
    quiz: { question: 'What does a CRS add to a pair of coordinate numbers?', options: ['The context needed to locate them on Earth', 'An altitude for every point', 'A map without any distortion'], answer: 0, explanation: 'A CRS defines the reference framework, axes, and units needed to interpret coordinates. It does not automatically add height or remove distortion.' },
  },
  {
    id: 'projections', name: 'Projections', short: 'Projections', mode: 'projection',
    source: 'https://proj.org/en/stable/operations/projections/tmerc.html', sourceName: 'PROJ · Map projections',
    steps: [
      { title: 'Every flat map makes a trade-off.', body: 'Compare the same Earth in three projections. Mercator preserves local angles but enlarges high-latitude areas. Equal Earth preserves relative areas. Equirectangular lays out longitude and latitude as a rectangular grid.', prompt: 'Change the projection. Turn on equal-radius circles to inspect distortion.', takeaway: 'A projection changes the map, not the geography.', detail: 'The circles have equal angular radii on the sphere. Their projected shapes reveal local distortion. Mercator cannot represent the poles at finite coordinates; its view here stops near ±80°.' },
      { title: 'One degree is not a fixed distance.', body: 'Longitude meridians get closer together toward the poles. One degree of longitude spans about 111 km at the equator and about 56 km at 60° latitude.', prompt: 'Change latitude and watch the distance of a 1° longitude interval.', takeaway: 'Do not treat degree coordinates as metre coordinates.', detail: 'The distance readout is the length along a WGS 84 ellipsoid parallel, calculated from its radius of curvature. It is not a straight-line projected measurement or a geodesic between distant endpoints.' },
      { title: 'Choose a projection for your task.', body: 'An equal-area projection helps compare areas. A conformal projection preserves local angles and shapes. An equidistant projection preserves specific distances, not every distance everywhere.', prompt: 'Compare Equal Earth and Mercator. Notice how the distortion circles change.', takeaway: 'Choose for the region and the measurement you need.', detail: 'A projected CRS with metre units is not automatically distortion-free. Grid distances can differ from ground distances. A local Transverse Mercator system reduces distortion near its central meridian, which is useful for Korea’s central belt.' },
    ],
    quiz: { question: 'Which statement about map projections is true?', options: ['Metre units guarantee exact ground distances', 'A flat world map can preserve every property', 'Different projections preserve different properties'], answer: 2, explanation: 'Projection choice is a trade-off. Units alone do not establish measurement accuracy, and no flat world map preserves every property.' },
  },
  {
    id: 'epsg', name: 'EPSG:4326', short: 'EPSG:4326', mode: 'globe',
    source: 'https://epsg.io/4326', sourceName: 'EPSG dataset · WGS 84 / 4326',
    steps: [
      { title: 'A short code. A full definition.', body: 'EPSG:4326 identifies a particular CRS definition in the EPSG dataset, maintained by IOGP. The code is a reference to its datum, coordinate axes, units, and area of use.', prompt: 'Open the definition below. Find the axes and their degree units.', takeaway: 'An EPSG code identifies a record. It is not just a projection number.', detail: 'The EPSG dataset also assigns codes to datums, ellipsoids, methods, and operations. For example, EPSG:15831 identifies a datum transformation, not a CRS. EPSG.org is the authoritative registry; EPSG.io is a convenient viewer.' },
      { title: 'EPSG:4326 is geographic WGS 84.', body: 'It describes horizontal locations worldwide in latitude and longitude, measured in degrees. It is widely used for exchanging geographic positions. Its official axis order is latitude first, longitude second.', prompt: 'Switch coordinate order. Notice how the same point gets a different tuple.', takeaway: 'The official definition and a software API can use different axis orders.', detail: 'GeoJSON and many JavaScript APIs use longitude, latitude. This does not change the location when the order is handled correctly. EPSG:4326 uses the WGS 84 datum ensemble; it should not be described as a single centimetre-accurate GPS reference realization.' },
    ],
    quiz: { question: 'What are the units of EPSG:4326?', options: ['Metres', 'Degrees', 'Pixels'], answer: 1, explanation: 'EPSG:4326 uses angular degree units. A screen may show pixels, but those pixels are not the CRS coordinate units.' },
  },
  {
    id: 'korea', name: 'EPSG:5186', short: 'EPSG:5186', mode: 'map',
    source: 'https://epsg.io/5186', sourceName: 'EPSG dataset · KGD2002 / Central Belt 2010',
    steps: [
      { title: 'A local grid for a local region.', body: 'EPSG:5186 is KGD2002 / Central Belt 2010. It uses Transverse Mercator with metre coordinates. Its intended area is South Korea onshore between 126°E and 128°E.', prompt: 'Compare Seoul with Busan. The central belt is highlighted on the map.', takeaway: 'EPSG:5186 is a central-belt CRS, not a grid intended for all of Korea.', detail: 'The base geographic CRS is KGD2002, EPSG:4737, on the GRS 1980 ellipsoid. The rectangular overlay shows the EPSG geographic bounding box, including water; the actual scope is onshore. The coastline is simplified Natural Earth data.' },
      { title: 'The origin does not have to be zero.', body: 'The natural origin is at 38°N, 127°E. Its easting is 200,000 m and its northing is 600,000 m. These false offsets shift the coordinate grid without moving any real location.', prompt: 'Choose Natural origin. Toggle the offsets in the coordinate inspector.', takeaway: 'False easting and northing change coordinate values, not the Earth.', detail: 'The central meridian is 127°E and its scale factor is 1. Northings increase northward; eastings increase eastward. Removing the offsets here only changes the explanatory readout, not the map’s registered CRS.' },
      { title: 'Read the full definition.', body: 'The datum, projection parameters, units, axes, and area of use all belong to the CRS. EPSG:5186 officially orders northing first and easting second, labelled X and Y in the authority definition.', prompt: 'Switch between EPSG axis order and the conventional API order.', takeaway: 'Field names are safer than assuming X always means easting.', detail: 'EPSG:5181 has a similar central-belt projection but a false northing of 500,000 m. EPSG:5179 is a different unified grid. Never substitute a nearby code based on a similar name. The 5186 record states it was legally mandated from 2010-01-01.' },
    ],
    quiz: { question: 'At EPSG:5186’s natural origin, what are easting and northing?', options: ['0 m and 0 m', '200,000 m and 600,000 m', '600,000 m and 200,000 m'], answer: 1, explanation: 'Named values are easting 200,000 m and northing 600,000 m. The official northing-first tuple is [600000, 200000], which is a different ordering of those same values.' },
  },
  {
    id: 'lab', name: 'Coordinate lab', short: 'Coordinate lab', mode: 'map',
    source: 'https://epsg.io/15831', sourceName: 'EPSG dataset · KGD2002 to WGS 84 operation',
    steps: [
      { title: 'Change the numbers. Keep the place.', body: 'Select a place on the map, or enter coordinates in either CRS. The lab transforms the values while keeping the real location the same. Geographic degrees become projected metres.', prompt: 'Click the map or drag the marker. Try entering a new easting and northing.', takeaway: 'A transformation changes the coordinate description of a location.', detail: 'This educational pipeline uses the approximate KGD2002/WGS 84 relation described by EPSG:15831, then the EPSG:5186 projection conversion. Its listed datum-operation accuracy is about 1 m. More displayed decimal places do not imply survey accuracy.' },
      { title: 'Order matters as much as units.', body: 'Our map API expects longitude, latitude and easting, northing. The EPSG definitions specify the opposite order for these two CRSs. Both can represent the same point when interpreted correctly.', prompt: 'Toggle the axis convention and compare both coordinate tuples.', takeaway: 'Use explicit field names at every library boundary.', detail: 'Proj4js uses longitude/latitude and easting/northing by default. OpenLayers uses conventional x/y coordinate arrays. The lab stores named fields internally and adapts the arrays explicitly.' },
      { title: 'Assigning is not transforming.', body: 'Assigning a CRS changes how software interprets existing numbers. Transforming calculates new numbers that describe the same location in another CRS. Relabelling degrees as metres does not convert them.', prompt: 'Try the relabelling experiment below, then return to the correctly transformed point.', takeaway: 'Assign the correct source CRS first. Then transform to the target CRS.', detail: 'In QGIS, changing the project CRS transforms the display without rewriting the layer’s stored coordinates. Reprojecting a layer creates transformed coordinates. The relabelling demonstration intentionally interprets degree values as metre values.' },
    ],
    quiz: { question: 'Your layer contains longitude/latitude degrees. What converts it to EPSG:5186?', options: ['Replace its CRS label with EPSG:5186', 'Swap the two columns only', 'Identify its source CRS and transform the coordinates'], answer: 2, explanation: 'A real transformation calculates projected metre coordinates from correctly identified geographic source coordinates. A new label alone leaves the original numbers unchanged.' },
  },
];

export const sources = [
  ['QGIS: Coordinate reference systems', 'Foundations, projection families, and practical exercises.', 'https://docs.qgis.org/3.44/en/docs/gentle_gis_introduction/coordinate_reference_systems.html'],
  ['EPSG:4326 · WGS 84', 'The geographic CRS definition, axes, and units.', 'https://epsg.io/4326'],
  ['EPSG:5186 · Central Belt 2010', 'Korea’s central-belt parameters and intended area.', 'https://epsg.io/5186'],
  ['EPSG:15831 · Datum transformation', 'The approximate KGD2002 to WGS 84 operation.', 'https://epsg.io/15831'],
  ['OSGeo Korea: Korean CRS guide', 'A Korean-language comparison of commonly used codes.', 'https://www.osgeo.kr/17'],
  ['QGIS tutorial: Working with projections', 'A practical guide by Ujaval Gandhi.', 'https://www.qgistutorials.com/en/docs/3/working_with_projections.html'],
  ['PROJ: Axis order', 'Why authority and software coordinate order can differ.', 'https://proj.org/en/stable/faq.html#why-is-the-axis-ordering-in-proj-not-consistent'],
  ['PROJ: Transverse Mercator', 'Parameters and mathematical background.', 'https://proj.org/en/stable/operations/projections/tmerc.html'],
  ['IOGP: EPSG guidance notes', 'The dataset, conversions, and WGS 84 accuracy.', 'https://epsg.org/guidance-notes.html'],
  ['Proj4js documentation', 'Browser transformations and API conventions.', 'https://proj4js.org/'],
];
export const videos = [
  ['Geographic and projected CRS', 'PSALM_GEO · English · Introduction', 'https://www.youtube.com/watch?v=GL833C2Gpn4'],
  ['Set a CRS in QGIS', '7StarTech · English · Practical', 'https://www.youtube.com/watch?v=bnxO0tO5UBc'],
  ['QGIS Cookbook: Coordinate systems', 'Kang Dong-jin · Korean · OSGeo Korea course', 'https://youtu.be/Ie3Dxek8jys'],
  ['Dynamic coordinate reference systems', 'IOGP · Advanced follow-up', 'https://www.youtube.com/playlist?list=PLt0-qTVCvEp1ZwKnf8iup320Cvp9AgXso'],
];
