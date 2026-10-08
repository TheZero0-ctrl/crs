export type VisualFocus = 'location' | 'latitude' | 'longitude' | 'datum' | 'projection' | 'summary' | 'distortion' | 'spacing' | 'choice' | 'epsg' | 'geographic' | 'belt' | 'origin' | 'definition' | 'transform' | 'axes' | 'assign';
export type LessonVisual = { focus: VisualFocus; label: string; cue: string; flat?: boolean; circles?: boolean; ellipsoid?: boolean };

export const lessonVisuals: Record<string, LessonVisual[]> = {
  foundations: [
    { focus: 'location', label: 'Two numbers locate one point', cue: 'The green and orange lines cross at your selected point.' },
    { focus: 'latitude', label: 'How far north or south?', cue: 'Latitude starts at 0° on the equator. The green line goes through your selected point and shows its latitude.' },
    { focus: 'longitude', label: 'How far east or west?', cue: 'Longitude starts at 0° on the line through Greenwich. The orange line goes through your selected point and shows its longitude.' },
    { focus: 'datum', label: 'Earth’s shape and our measuring system', cue: 'Compare the round outline with the flattened model. The flattening is made larger here so you can see it.', ellipsoid: true },
    { focus: 'projection', label: 'The same point on a flat map', cue: 'The orange dot shows the same place on the globe and the flat map.', flat: true },
    { focus: 'summary', label: 'What a CRS tells us', cue: 'Look at how the Earth model, coordinate names, and units give meaning to the numbers.' },
  ],
  projections: [
    { focus: 'distortion', label: 'Same-size circles, different-looking maps', cue: 'These circles are the same size on a spherical Earth. Compare how the flat map changes their size and shape.', flat: true, circles: true },
    { focus: 'spacing', label: 'How long is one degree?', cue: 'The orange line covers 1° of longitude. Move north or south and watch its real-world length change.', flat: true },
    { focus: 'choice', label: 'What do you want to measure?', cue: 'Choose Compare areas or Local angles below. Watch the map change to match that choice.', flat: true, circles: true },
  ],
  epsg: [
    { focus: 'epsg', label: 'A code for a coordinate system', cue: 'EPSG:4326 is a lookup code. It tells software which agreed coordinate system to use.' },
    { focus: 'geographic', label: 'Which number comes first?', cue: 'Watch latitude and longitude switch places in the pair. The numbers still describe the same point.' },
  ],
  korea: [
    { focus: 'belt', label: 'Where this Korean grid is used', cue: 'The shaded box lies between 126°E and 128°E. This coordinate system is intended for land inside that part of South Korea.' },
    { focus: 'origin', label: 'Why the starting values are not zero', cue: 'The highlighted starting point has easting 200,000 m and northing 600,000 m. Move your point and compare its values.' },
    { focus: 'definition', label: 'Find the settings on the map', cue: 'Find the starting point and the line at 127°E. The arrows show which way easting and northing increase.' },
  ],
  lab: [
    { focus: 'transform', label: 'New numbers for the same place', cue: 'Follow the same location as its coordinates change from degrees to metres.' },
    { focus: 'axes', label: 'Change the order, not the place', cue: 'Switch which number comes first. The point and the north/east directions on the map stay the same.' },
    { focus: 'assign', label: 'What happens if we change only the label?', cue: 'Green shows the correct place. Orange shows the wrong place we get by treating degree numbers as metres.' },
  ],
};
