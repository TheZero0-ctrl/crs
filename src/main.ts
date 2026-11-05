import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-mono/latin-400.css';
import './styles.css';
import './courses.css';
import { startCrsCourse } from './crs-course';
import { startGeoJsonCourse } from './geojson-course';
import { renderLibrary } from './course-library';

const params = new URL(location.href).searchParams;
if (params.get('course') === 'geojson') startGeoJsonCourse();
else if (params.get('course') === 'crs' || !params.has('course') && params.has('lesson')) startCrsCourse();
else renderLibrary();
