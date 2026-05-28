/**
 * SCORM 1.2 Exporter Service - Barrel Export
 * Re-exports all SCORM functions from focused sub-modules.
 * Import from here for backwards compatibility:
 *   import { exportToScorm } from '../services/scormExporter';
 */

// Text sanitization & language filtering
export {
  sanitizeQuestionText,
  isEnglishText,
  filterEnglishQuestions,
} from "./scorm/sanitize";

// Question format conversion
export { convertQuestionToScormFormat } from "./scorm/converter";

// Pre-export validation
export {
  validateQuestionsForExport,
  filterExportableQuestions,
} from "./scorm/validator";

// ZIP packaging, download, and batch export
export {
  generateScormPackageFiles,
  exportToScorm,
  groupQuestionsByDiscipline,
  groupQuestionsByLanguageAndDiscipline,
  batchExportByDiscipline,
} from "./scorm/packager";
