import { geoJsonChapters, geoJsonSources } from './geojson-lessons';
import type { Position } from 'geojson';
import { safeIndex, normalizePositions, resolvePosition, type LessonPositions } from './navigation';
import { presets, from5186, to5186, readSaved, save, parseCoordinate, validateGeographic } from './geo/coordinates';
import { createExample, exercises, checkExercise, geometryTypes, pointFromUrl, initialLine, formatGeoJson, type ExampleOptions } from './geo/geojson-examples';
import { geoJsonMap, bindGeoJsonPointEditing, readGeoJsonMapView, type GeoJsonMapView } from './visuals/geojson-map';

type Progress = { lesson?: number; positions?: LessonPositions; completed?: string[] };
const progressKey = 'atlas-geojson-progress';
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function startGeoJsonCourse() {
  const app = document.querySelector<HTMLElement>('#app')!;
  const select = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
  const url = new URL(location.href);
  const raw = readSaved<Progress | null>(progressKey, null);
  const saved = raw && typeof raw === 'object' ? raw : {};
  const positions = normalizePositions(saved.positions, geoJsonChapters);
  const completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(id => geoJsonChapters.some(c => c.id === id)));
  const requested = geoJsonChapters.findIndex(c => c.id === url.searchParams.get('lesson'));
  let chapterIndex = requested >= 0 ? requested : safeIndex(saved.lesson, geoJsonChapters.length);
  const chapter = () => geoJsonChapters[chapterIndex];
  const initial = resolvePosition(chapterIndex, positions, url, undefined, geoJsonChapters);
  let stepIndex = initial.step;
  let quiz = initial.quiz;
  const choices: Record<string, number> = {};
  const options: ExampleOptions = { point: pointFromUrl(url, { ...presets.Seoul }), height: 30, geometry: 'Point', hole: true, name: 'Seoul', split: true, line: initialLine(), polygonScale: 1, holeScale: 1, includeRoute: true, crossing: { west: 170, east: -170, latitude: 45 } };
  let mercator = false;
  let exerciseIndex = 0;
  let selectedVertex = 0;
  const topic = () => chapter().steps[stepIndex];
  const editablePoint = () => ['point', 'height', 'feature', 'collection', 'crs', 'export'].includes(topic().example) || topic().example === 'geometry' && ['Point', 'GeometryCollection'].includes(options.geometry);
  const editableLine = () => topic().example === 'bbox' || topic().example === 'geometry' && ['LineString', 'MultiPoint', 'MultiLineString'].includes(options.geometry);
  const editablePolygon = () => topic().example === 'rings' || topic().example === 'geometry' && ['Polygon', 'MultiPolygon'].includes(options.geometry);
  const currentView = () => readGeoJsonMapView(app.querySelector<SVGSVGElement>('.geojson-map')!);

  function persist() {
    positions[chapter().id] = { step: stepIndex, quiz };
    save(progressKey, { lesson: chapterIndex, positions, completed: [...completed] });
    const next = new URL(location.href);
    next.searchParams.set('course', 'geojson');
    next.searchParams.set('lesson', chapter().id);
    next.searchParams.set('step', String(stepIndex));
    next.searchParams.set('lon', String(options.point.longitude));
    next.searchParams.set('lat', String(options.point.latitude));
    if (quiz) next.searchParams.set('check', '1'); else next.searchParams.delete('check');
    try { history.replaceState(null, '', next); } catch { /* Embedded previews may restrict history. */ }
  }

  function navigate(index: number, nextStep?: number | 'quiz') {
    persist();
    chapterIndex = safeIndex(index, geoJsonChapters.length);
    const remembered = resolvePosition(chapterIndex, positions, undefined, undefined, geoJsonChapters);
    quiz = nextStep === 'quiz' || nextStep === undefined && remembered.quiz;
    stepIndex = typeof nextStep === 'number' ? safeIndex(nextStep, chapter().steps.length) : nextStep === 'quiz' ? chapter().steps.length - 1 : remembered.step;
    render();
    select('#lesson').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function controls() {
    const kind = topic().example;
    if (kind === 'practice') return `<label class="coordinate-field">Exercise<select id="exercise">${exercises.map((exercise, i) => `<option value="${i}" ${i === exerciseIndex ? 'selected' : ''}>${exercise.name}</option>`).join('')}</select></label><p id="exercise-instruction"></p><button class="secondary-button" id="solution">Show solution</button>`;
    return `${editablePoint() && kind !== 'export' ? `<form id="point-form"><label class="coordinate-field"><span>Longitude · degrees east</span><input id="longitude" type="number" min="-180" max="180" step="any" required value="${options.point.longitude}"/></label><label class="coordinate-field"><span>Latitude · degrees north</span><input id="latitude" type="number" min="-90" max="90" step="any" required value="${options.point.latitude}"/></label><button class="apply-button" type="submit">Update position →</button></form>` : ''}
      ${kind === 'height' ? `<label class="coordinate-field"><span>Ellipsoidal height · metres</span><input id="height" type="number" step="any" value="${options.height}"/></label>` : ''}
      ${kind === 'geometry' ? `<label class="coordinate-field">Geometry type<select id="geometry">${geometryTypes.map(type => `<option ${type === options.geometry ? 'selected' : ''}>${type}</option>`).join('')}</select></label>` : ''}
      ${editableLine() ? `<form id="vertex-form"><label class="coordinate-field">Selected position<select id="vertex">${options.line!.map((_, i) => `<option value="${i}" ${i === selectedVertex ? 'selected' : ''}>Position ${i + 1}</option>`).join('')}</select></label><label class="coordinate-field"><span>Longitude · degrees east</span><input id="vertex-longitude" type="number" min="-180" max="180" step="any" required/></label><label class="coordinate-field"><span>Latitude · degrees north</span><input id="vertex-latitude" type="number" min="-90" max="90" step="any" required/></label><button class="apply-button" type="submit">Update position →</button></form><div class="geometry-actions"><button class="secondary-button" id="add-vertex" ${options.line!.length >= 8 ? 'disabled' : ''}>Add position</button><button class="secondary-button" id="remove-vertex" ${options.line!.length <= 2 ? 'disabled' : ''}>Remove</button></div>${options.geometry === 'MultiLineString' && kind === 'geometry' ? '<p>Edit the first line. The second part stays fixed for comparison.</p>' : ''}` : ''}
      ${editablePolygon() ? `<label class="check-label"><input id="hole" type="checkbox" ${options.hole ? 'checked' : ''}/> Include a hole</label>${rangeControl('polygon-scale', 'Polygon size', .5, 1.5, .05, options.polygonScale!)}${rangeControl('hole-scale', 'Hole size', .4, 1.5, .05, options.holeScale!, !options.hole)}<p>Handle 1 resizes the exterior. Handle 2 resizes the hole. Rings stay closed and keep their winding.</p>` : ''}
      ${editableLine() || editablePolygon() ? '<button class="text-button" id="reset-geometry">Reset shape</button>' : ''}
      ${kind === 'feature' || kind === 'collection' ? `<label class="coordinate-field"><span>Place name</span><input id="feature-name" value="${escape(options.name)}" maxlength="100"/></label>` : ''}
      ${kind === 'collection' ? `<label class="check-label"><input id="include-route" type="checkbox" ${options.includeRoute ? 'checked' : ''}/> Include route Feature</label><p id="feature-count" role="status"></p>` : ''}
      ${kind === 'crs' ? `<label class="coordinate-field">Display projection<select id="display-projection"><option value="geographic">Longitude / latitude</option><option value="mercator" ${mercator ? 'selected' : ''}>Web Mercator illustration</option></select></label><div class="axis-box"><span>GeoJSON / OGC:CRS84</span><code id="crs-tuple"></code><span>EPSG:4326 official order</span><code id="official-tuple"></code></div>` : ''}
      ${kind === 'export' ? `<form id="export-form"><p>EPSG:5186 · metres</p><label class="coordinate-field"><span>Easting</span><input id="easting" type="number" step="any" required/></label><label class="coordinate-field"><span>Northing</span><input id="northing" type="number" step="any" required/></label><button class="apply-button" type="submit">Transform to GeoJSON →</button></form><p class="coordinate-subtitle">Educational transformation, approximately 1 m stated accuracy. Use the central belt of South Korea.</p>` : ''}
      ${kind === 'antimeridian' ? `<label class="check-label"><input id="split" type="checkbox" ${options.split ? 'checked' : ''}/> Split at ±180°</label>${rangeControl('crossing-west', 'Start longitude · °E', 150, 179, 1, options.crossing!.west)}${rangeControl('crossing-east', 'End longitude · °E', -179, -150, 1, options.crossing!.east)}${rangeControl('crossing-latitude', 'Latitude · °N', -60, 60, 1, options.crossing!.latitude)}<p id="longitude-span" role="status"></p>` : ''}
      ${kind === 'bbox' ? '<p>The dashed rectangle follows the coordinate extremes as you move the numbered positions.</p><code id="bbox-readout" class="extent-readout"></code>' : ''}<p id="input-error" role="alert" hidden></p>`;
  }

  function rangeControl(id: string, label: string, min: number, max: number, step: number, value: number, disabled = false) {
    return `<label class="coordinate-field"><span>${label}<output id="${id}-value">${value}</output></span><input id="${id}" type="range" class="coordinate-range" min="${min}" max="${max}" step="${step}" value="${value}" ${disabled ? 'disabled' : ''}/></label>`;
  }

  function updateExample(view?: GeoJsonMapView) {
    if (quiz || topic().example === 'practice') return;
    const example = createExample(topic().example, options);
    select('#geojson-output').textContent = formatGeoJson(example);
    let vertices: Position[] | undefined = undefined;
    if (editableLine()) {
      vertices = options.line!;
      selectedVertex = safeIndex(selectedVertex, vertices.length);
      select<HTMLSelectElement>('#vertex').value = String(selectedVertex);
      select<HTMLInputElement>('#vertex-longitude').value = String(vertices[selectedVertex][0]);
      select<HTMLInputElement>('#vertex-latitude').value = String(vertices[selectedVertex][1]);
    } else if (editablePolygon()) {
      const polygon = createExample('rings', options);
      if (polygon.type === 'Polygon') vertices = polygon.coordinates.map(ring => ring[2]);
      selectedVertex = safeIndex(selectedVertex, vertices?.length ?? 1);
    }
    const editing = editablePoint() || vertices ? { ...view, vertices, selectedVertex, hint: editableLine() ? 'Drag a numbered position, or click the map to move the selected position.' : editablePolygon() ? 'Drag handle 1 to resize the polygon, or handle 2 to resize its hole.' : undefined } : undefined;
    select('#geojson-map').innerHTML = geoJsonMap(example, topic().example === 'crs' && mercator, topic().example === 'antimeridian', editing);
    if (topic().example === 'crs') {
      select('#crs-tuple').textContent = `[${options.point.longitude}, ${options.point.latitude}]`;
      select('#official-tuple').textContent = `[${options.point.latitude}, ${options.point.longitude}]`;
    }
    if (topic().example === 'bbox') select('#bbox-readout').textContent = `bbox [${example.bbox!.join(', ')}]`;
    if (example.type === 'FeatureCollection') {
      const count = `${example.features.length} ${example.features.length === 1 ? 'Feature' : 'Features'} in the collection.`;
      if (select('#feature-count').textContent !== count) select('#feature-count').textContent = count;
    }
    if (topic().example === 'antimeridian') {
      const span = 360 - options.crossing!.west + options.crossing!.east;
      select('#longitude-span').textContent = options.split ? `${span}° across the antimeridian, in two parts.` : `${360 - span}° through Greenwich, in one coordinate segment.`;
    }
    persist();
  }

  function showError(message = '') {
    const error = select('#input-error');
    error.textContent = message;
    error.hidden = !message;
  }

  function loadExercise() {
    select('#exercise-instruction').textContent = exercises[exerciseIndex].instruction;
    select<HTMLTextAreaElement>('#exercise-json').value = JSON.stringify(exercises[exerciseIndex].broken, null, 2);
    select('#exercise-feedback').textContent = '';
  }

  function render() {
    if (topic().example === 'export') {
      try { to5186(options.point); } catch { options.point = { ...presets.Seoul }; }
    }
    persist();
    document.title = `${chapter().name} · GeoJSON · Coordinate atlas`;
    const choice = choices[chapter().id];
    const correct = choice === chapter().quiz.answer;
    app.innerHTML = `<header class="app-header"><a class="brand" href="${import.meta.env.BASE_URL}">coordinate<span class="brand-light">atlas</span></a><div class="header-actions"><a class="course-back" href="${import.meta.env.BASE_URL}">Back to courses</a><button class="source-button" id="sources">Sources</button></div></header>
      <div class="app-layout"><aside class="sidebar" aria-label="GeoJSON course navigation"><span class="eyebrow course-label">GEOJSON COURSE</span><nav class="chapter-nav" aria-label="Chapters">${geoJsonChapters.map((c, i) => `<div class="chapter-group"><button class="chapter ${chapterIndex === i ? 'active' : ''}" data-chapter="${i}" ${chapterIndex === i ? 'aria-current="true"' : ''}><span class="chapter-number">${completed.has(c.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="chapter-copy"><strong>${c.name}</strong></span></button>${chapterIndex === i ? `<ol class="topic-outline">${c.steps.map((s, j) => `<li><button class="topic-button ${!quiz && stepIndex === j ? 'active' : ''}" data-step="${j}" ${!quiz && stepIndex === j ? 'aria-current="step"' : ''}>${s.title}</button></li>`).join('')}<li><button class="topic-button ${quiz ? 'active' : ''}" id="quiz-topic" ${quiz ? 'aria-current="step"' : ''}>Knowledge check</button></li></ol>` : ''}</div>`).join('')}</nav><div class="course-progress"><div><span>GeoJSON progress</span><span>${completed.size} / ${geoJsonChapters.length}</span></div><div class="progress-track"><span style="width:${completed.size / geoJsonChapters.length * 100}%"></span></div></div><button class="text-button" id="restart">Restart GeoJSON course</button></aside>
      <main id="lesson" tabindex="-1"><div class="lesson-meta"><span class="eyebrow">GEOJSON · ${chapter().short.toUpperCase()}</span></div><label class="mobile-topics"><span>Topic</span><select id="topic-picker">${chapter().steps.map((s, i) => `<option value="${i}" ${!quiz && stepIndex === i ? 'selected' : ''}>${s.title}</option>`).join('')}<option value="quiz" ${quiz ? 'selected' : ''}>Knowledge check</option></select></label>
      ${quiz ? `<section class="knowledge-check"><h1>Knowledge check</h1><h2>${chapter().quiz.question}</h2><div class="answer-options">${chapter().quiz.options.map((answer, i) => `<button class="answer-button ${choice === i ? correct ? 'correct' : 'incorrect' : ''}" data-answer="${i}">${answer}</button>`).join('')}</div><p id="quiz-feedback" class="quiz-feedback" role="status">${choice === undefined ? 'Choose an answer. You can try again.' : `${correct ? 'Correct.' : 'Not quite.'} ${chapter().quiz.explanation}`}</p></section>` : `
      <div class="lesson-content"><div class="lesson-intro"><div><h1>${topic().title}</h1><p>${topic().body}</p></div><span class="step-position">Step ${stepIndex + 1} of ${chapter().steps.length}</span></div><div class="workspace geojson-workspace"><section class="visual-panel" aria-label="GeoJSON example">${topic().example === 'practice' ? `<div class="diagram-focus"><strong>Repair the example</strong><p>These checks apply to the selected exercise, not arbitrary GeoJSON files.</p></div><label class="editor-label" for="exercise-json">Editable GeoJSON</label><textarea id="exercise-json" class="json-editor" spellcheck="false"></textarea><button class="secondary-button exercise-check" id="check-exercise">Check repair</button><p id="exercise-feedback" role="status"></p>` : `<div id="geojson-map"></div><div class="json-heading"><span class="eyebrow">${topic().example === 'export' ? 'EXPORTED GEOJSON · WGS 84 DEGREES' : 'GEOJSON'}</span><button class="compact-button" id="download">Download .geojson</button></div><pre id="geojson-output" class="json-output" tabindex="0" aria-label="GeoJSON example source"></pre>`}<div class="try-this"><p>${topic().prompt}</p></div></section><aside class="inspector" aria-label="Example controls"><span class="eyebrow">EXPLORE THE EXAMPLE</span>${controls()}</aside></div><div class="takeaway"><span class="eyebrow">KEY IDEA</span><p>${topic().takeaway}</p></div><section class="technical"><h2>Details</h2><p>${topic().detail}</p><p><a href="${chapter().source}#section-${topic().section}" target="_blank" rel="noreferrer">Read RFC 7946, section ${topic().section} ↗</a></p>${chapter().id === 'geojson-crs' ? `<p><a href="?course=crs&lesson=epsg&step=1">Explore WGS 84 and axis order in the CRS course ↗</a></p><p><a href="?course=crs&lesson=lab&step=0">Open the CRS transformation lab ↗</a></p>` : ''}</section></div>`}
      <footer class="lesson-footer"><button class="back-button" id="back" ${!quiz && chapterIndex === 0 && stepIndex === 0 ? 'disabled' : ''}>← Previous</button><span class="footer-position">${quiz ? 'Knowledge check' : `Step ${stepIndex + 1} of ${chapter().steps.length}`}</span><button class="next-button" id="next" ${quiz && !correct ? 'disabled aria-describedby="quiz-feedback"' : ''}>${quiz ? chapterIndex === geoJsonChapters.length - 1 ? 'Back to courses' : 'Next chapter' : stepIndex === chapter().steps.length - 1 ? 'Knowledge check' : 'Next'} →</button></footer></main></div>
      <dialog id="sources-dialog" class="sources-dialog"><div class="dialog-heading"><h2>GeoJSON sources</h2><button class="close-dialog" aria-label="Close sources">✕</button></div><p class="source-disclaimer">RFC 7946 is the source for format rules. Library documentation explains implementation choices; geojson.io is an optional practice tool.</p><div class="resource-list">${geoJsonSources.map(([title, description, href]) => `<a href="${href}" target="_blank" rel="noreferrer"><div><strong>${title}</strong><p>${description}</p></div><span>↗</span></a>`).join('')}</div></dialog>`;
    bind();
    const chapterNav = select<HTMLElement>('.chapter-nav');
    const activeGroup = select<HTMLElement>('.chapter.active').parentElement!;
    if (chapterNav.scrollWidth > chapterNav.clientWidth) {
      chapterNav.scrollLeft = activeGroup.getBoundingClientRect().left - chapterNav.getBoundingClientRect().left + chapterNav.scrollLeft - (chapterNav.clientWidth - activeGroup.clientWidth) / 2;
    }
    if (!quiz && topic().example === 'export') {
      const projected = to5186(options.point);
      select<HTMLInputElement>('#easting').value = projected.easting.toFixed(3);
      select<HTMLInputElement>('#northing').value = projected.northing.toFixed(3);
    }
    if (!quiz && topic().example === 'practice') loadExercise(); else updateExample();
  }

  function bind() {
    if (!quiz && (editablePoint() || editableLine() || editablePolygon())) bindGeoJsonPointEditing(select('#geojson-map'), (point, view, vertexIndex) => {
      try {
        validateGeographic(point);
        if (editableLine()) {
          if (vertexIndex !== undefined) selectedVertex = safeIndex(vertexIndex, options.line!.length);
          options.line![selectedVertex] = [point.longitude, point.latitude];
          showError(); updateExample(view); return;
        }
        if (editablePolygon()) {
          if (vertexIndex !== undefined) selectedVertex = safeIndex(vertexIndex, options.hole ? 2 : 1);
          const hole = selectedVertex === 1 && options.hole;
          const scale = hole
            ? Math.max(Math.abs(point.longitude - 127.05) / .15, Math.abs(point.latitude - 37.55) / .1) / options.polygonScale!
            : Math.max(Math.abs(point.longitude - 127.05) / .35, Math.abs(point.latitude - 37.55) / .25);
          const value = Number(Math.max(hole ? .4 : .5, Math.min(1.5, scale)).toFixed(2));
          if (hole) options.holeScale = value; else options.polygonScale = value;
          const id = hole ? 'hole-scale' : 'polygon-scale';
          select<HTMLInputElement>(`#${id}`).value = String(value);
          select(`#${id}-value`).textContent = String(value);
          showError(); updateExample(view); return;
        }
        const projected = topic().example === 'export' ? to5186(point) : null;
        options.point = point;
        if (projected) {
          select<HTMLInputElement>('#easting').value = projected.easting.toFixed(3);
          select<HTMLInputElement>('#northing').value = projected.northing.toFixed(3);
        } else {
          select<HTMLInputElement>('#longitude').value = String(point.longitude);
          select<HTMLInputElement>('#latitude').value = String(point.latitude);
        }
        showError(); updateExample(view);
      } catch (error) { showError((error as Error).message); }
    });
    app.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(button => button.addEventListener('click', () => navigate(Number(button.dataset.chapter))));
    app.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => button.addEventListener('click', () => navigate(chapterIndex, Number(button.dataset.step))));
    app.querySelector('#quiz-topic')?.addEventListener('click', () => navigate(chapterIndex, 'quiz'));
    select('#topic-picker').addEventListener('change', event => { const value = (event.target as HTMLSelectElement).value; navigate(chapterIndex, value === 'quiz' ? 'quiz' : Number(value)); });
    select('#back').addEventListener('click', () => {
      if (quiz) navigate(chapterIndex, chapter().steps.length - 1);
      else if (stepIndex > 0) navigate(chapterIndex, stepIndex - 1);
      else if (chapterIndex > 0) navigate(chapterIndex - 1, geoJsonChapters[chapterIndex - 1].steps.length - 1);
    });
    select('#next').addEventListener('click', () => {
      if (!quiz) navigate(chapterIndex, stepIndex < chapter().steps.length - 1 ? stepIndex + 1 : 'quiz');
      else if (choices[chapter().id] === chapter().quiz.answer) {
        if (chapterIndex < geoJsonChapters.length - 1) navigate(chapterIndex + 1, 0);
        else location.href = import.meta.env.BASE_URL;
      }
    });
    app.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => button.addEventListener('click', () => {
      const answer = Number(button.dataset.answer);
      choices[chapter().id] = answer;
      if (answer === chapter().quiz.answer) completed.add(chapter().id);
      render(); select(`[data-answer="${answer}"]`).focus({ preventScroll: true });
    }));
    app.querySelector('#point-form')?.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const point = { longitude: parseCoordinate(select<HTMLInputElement>('#longitude').value), latitude: parseCoordinate(select<HTMLInputElement>('#latitude').value) };
        validateGeographic(point); options.point = point; showError(); updateExample();
      } catch (error) { showError((error as Error).message); }
    });
    app.querySelector('#geometry')?.addEventListener('change', event => { options.geometry = (event.target as HTMLSelectElement).value as ExampleOptions['geometry']; render(); select('#geometry').focus({ preventScroll: true }); });
    app.querySelector('#hole')?.addEventListener('change', event => {
      options.hole = (event.target as HTMLInputElement).checked;
      select<HTMLInputElement>('#hole-scale').disabled = !options.hole;
      updateExample(currentView());
    });
    app.querySelector('#vertex')?.addEventListener('change', event => {
      selectedVertex = safeIndex((event.target as HTMLSelectElement).value, options.line!.length);
      updateExample(currentView());
    });
    app.querySelector('#vertex-form')?.addEventListener('submit', event => {
      event.preventDefault();
      try {
        const point = { longitude: parseCoordinate(select<HTMLInputElement>('#vertex-longitude').value), latitude: parseCoordinate(select<HTMLInputElement>('#vertex-latitude').value) };
        validateGeographic(point);
        options.line![selectedVertex] = [point.longitude, point.latitude];
        showError(); updateExample();
      } catch (error) { showError((error as Error).message); }
    });
    app.querySelector('#add-vertex')?.addEventListener('click', () => {
      const line = options.line!;
      if (line.length >= 8) return;
      const current = line[selectedVertex], next = line[selectedVertex + 1];
      const position = next ? [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2] : [Math.min(180, current[0] + .1), Math.min(90, current[1] + .1)];
      line.splice(selectedVertex + 1, 0, position.map(value => Number(value.toFixed(6))));
      selectedVertex++; render(); select('#vertex').focus({ preventScroll: true });
    });
    app.querySelector('#remove-vertex')?.addEventListener('click', () => {
      if (options.line!.length <= 2) return;
      options.line!.splice(selectedVertex, 1);
      selectedVertex = safeIndex(selectedVertex, options.line!.length);
      render(); select('#vertex').focus({ preventScroll: true });
    });
    app.querySelector('#reset-geometry')?.addEventListener('click', () => {
      options.line = initialLine(); options.polygonScale = 1; options.holeScale = 1; options.hole = true;
      selectedVertex = 0; render(); select('#reset-geometry').focus({ preventScroll: true });
    });
    for (const [id, key] of [['polygon-scale', 'polygonScale'], ['hole-scale', 'holeScale']] as const) {
      app.querySelector(`#${id}`)?.addEventListener('input', event => {
        options[key] = Number((event.target as HTMLInputElement).value);
        select(`#${id}-value`).textContent = String(options[key]);
        updateExample(currentView());
      });
    }
    for (const [id, key] of [['crossing-west', 'west'], ['crossing-east', 'east'], ['crossing-latitude', 'latitude']] as const) {
      app.querySelector(`#${id}`)?.addEventListener('input', event => {
        options.crossing![key] = Number((event.target as HTMLInputElement).value);
        select(`#${id}-value`).textContent = String(options.crossing![key]);
        updateExample();
      });
    }
    app.querySelector('#include-route')?.addEventListener('change', event => {
      options.includeRoute = (event.target as HTMLInputElement).checked; updateExample();
    });
    app.querySelector('#height')?.addEventListener('input', event => {
      try { options.height = parseCoordinate((event.target as HTMLInputElement).value); showError(); updateExample(); } catch (error) { showError((error as Error).message); }
    });
    app.querySelector('#feature-name')?.addEventListener('input', event => { options.name = (event.target as HTMLInputElement).value; updateExample(); });
    app.querySelector('#display-projection')?.addEventListener('change', event => { mercator = (event.target as HTMLSelectElement).value === 'mercator'; updateExample(); });
    app.querySelector('#split')?.addEventListener('change', event => { options.split = (event.target as HTMLInputElement).checked; updateExample(); });
    app.querySelector('#export-form')?.addEventListener('submit', event => {
      event.preventDefault();
      try {
        options.point = from5186({ easting: parseCoordinate(select<HTMLInputElement>('#easting').value), northing: parseCoordinate(select<HTMLInputElement>('#northing').value) });
        showError(); updateExample();
      } catch (error) { showError((error as Error).message); }
    });
    app.querySelector('#exercise')?.addEventListener('change', event => { exerciseIndex = Number((event.target as HTMLSelectElement).value); loadExercise(); });
    app.querySelector('#solution')?.addEventListener('click', () => {
      select<HTMLTextAreaElement>('#exercise-json').value = JSON.stringify(exercises[exerciseIndex].solution, null, 2);
      select('#exercise-feedback').textContent = 'Solution shown. Compare it with the exercise instructions, then check the repair.';
    });
    app.querySelector('#check-exercise')?.addEventListener('click', () => {
      const error = checkExercise(select<HTMLTextAreaElement>('#exercise-json').value, exerciseIndex);
      select('#exercise-feedback').textContent = error ?? 'Correct. This example now matches the intended structure and location.';
    });
    app.querySelector('#download')?.addEventListener('click', () => {
      const href = URL.createObjectURL(new Blob([select('#geojson-output').textContent!], { type: 'application/geo+json' }));
      const link = document.createElement('a'); link.href = href; link.download = `${chapter().id}.geojson`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    });
    select('#restart').addEventListener('click', () => {
      for (const id of Object.keys(positions)) delete positions[id];
      for (const id of Object.keys(choices)) delete choices[id];
      completed.clear(); chapterIndex = 0; stepIndex = 0; quiz = false;
      options.point = { ...presets.Seoul }; options.line = initialLine(); options.polygonScale = 1; options.holeScale = 1;
      options.hole = true; options.includeRoute = true; options.split = true; options.crossing = { west: 170, east: -170, latitude: 45 };
      selectedVertex = 0; render(); select('#lesson').focus({ preventScroll: true });
    });
    const dialog = select<HTMLDialogElement>('#sources-dialog');
    select('#sources').addEventListener('click', () => dialog.showModal());
    select('.close-dialog').addEventListener('click', () => dialog.close());
  }
  render();
}
