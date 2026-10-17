import { coursesCoreApi } from './courses-core.api';
import { coursesVideoUploadApi } from './courses-video-upload.api';
import { coursesQaViewerApi } from './courses-qa-viewer.api';
import { coursesEnrollmentsApi } from './courses-enrollments.api';

export * from './courses-core.api';
export * from './courses-video-upload.api';
export * from './courses-qa-viewer.api';
export * from './courses-enrollments.api';

export const coursesApi = {
  ...coursesCoreApi,
  ...coursesVideoUploadApi,
  ...coursesQaViewerApi,
  ...coursesEnrollmentsApi,
};

export default coursesApi;
