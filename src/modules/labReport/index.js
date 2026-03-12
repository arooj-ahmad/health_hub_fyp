/**
 * Lab Report module barrel export.
 */
export { default as LabInputSelector } from './LabInputSelector';
export { default as ManualLabForm } from './ManualLabForm';
export { default as PdfUpload } from './PdfUpload';
export { default as LabReportResult } from './LabReportResult';
export { analyzeLabReport, extractPdfText } from './LabAnalyzerService';
export {
  buildLabPrompt,
  computeSystemValues,
  formatManualLabValues,
  calcBMI,
  bmiCategory,
  autoGoal,
  targetWeight,
  calcCalories,
} from './LabDietPrompt';
