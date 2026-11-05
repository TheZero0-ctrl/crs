import { lessons } from './lessons';
import { geoJsonChapters } from './geojson-lessons';
import { readSaved } from './geo/coordinates';

export function completedCount(key: string, ids: string[]): { started: boolean; count: number } {
  const saved = readSaved<unknown>(key, null);
  if (!saved || typeof saved !== 'object') return { started: false, count: 0 };
  const completed = (saved as { completed?: unknown }).completed;
  return { started: true, count: Array.isArray(completed) ? new Set(completed.filter(id => ids.includes(id))).size : 0 };
}

export function renderLibrary() {
  document.title = 'Coordinate atlas · Courses';
  const courses = [
    { id: 'crs', title: 'Coordinate reference systems', description: 'Understand how coordinates locate a place on Earth through interactive maps and experiments.', chapters: lessons, key: 'atlas-progress' },
    { id: 'geojson', title: 'GeoJSON', description: 'Learn to read and write geographic data with linked maps, JSON examples, and hands-on exercises.', chapters: geoJsonChapters, key: 'atlas-geojson-progress' },
  ];
  document.querySelector('#app')!.innerHTML = `<header class="app-header"><a class="brand" href="${import.meta.env.BASE_URL}">coordinate<span class="brand-light">atlas</span></a></header>
    <main id="lesson" class="course-library" tabindex="-1"><span class="eyebrow">INTERACTIVE COURSES</span><h1>Explore geographic data.</h1><p class="library-intro">Choose a course and learn through maps, examples, and experiments.</p>
    <div class="course-grid">${courses.map((course, i) => {
      const progress = completedCount(course.key, course.chapters.map(chapter => chapter.id));
      return `<article class="course-card"><span class="eyebrow">COURSE ${String(i + 1).padStart(2, '0')}</span><h2>${course.title}</h2><p>${course.description}</p><div class="library-progress"><span>${progress.count} / ${course.chapters.length} chapters complete</span><div class="progress-track"><span style="width:${progress.count / course.chapters.length * 100}%"></span></div></div><a class="next-button" href="?course=${course.id}">${progress.started ? 'Continue' : 'Start course'} →</a></article>`;
    }).join('')}</div></main>`;
}
