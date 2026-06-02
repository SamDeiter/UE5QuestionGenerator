import { validateURL } from "./urlValidator";
import { validateAnswer } from "./answerValidator";

/**
 * Unified Question Validator
 * Checks for:
 * 1. Critical failures (Auto-reject):
 *    - Missing source URL
 *    - Invalid URL pattern
 *    - Missing source excerpt
 *    - Excerpt too short (< 20 chars)
 *
 * 2. Warnings (Flag for review):
 *    - Answer doesn't match source excerpt (low confidence)
 *    - URL missing "-in-unreal-engine" suffix (medium confidence)
 *
 * @param {Object} question - The question object to validate
 * @returns {{
 *   isValid: boolean,
 *   isCriticalFailure: boolean,
 *   confidence: number,
 *   warnings: string[],
 *   details: Object
 * }}
 */
export function validateQuestion(question) {
  const warnings = [];
  let isCriticalFailure = false;
  let overallConfidence = 100;

  const urlResult = validateURL(question.SourceURL || question.sourceUrl);
  if (!urlResult.isValid) {
    isCriticalFailure = true;
    warnings.push(`Critical: ${urlResult.warning}`);
  } else if (urlResult.warning) {
    warnings.push(urlResult.warning);
    overallConfidence = Math.min(overallConfidence, urlResult.confidence);
  }

  // 2. Validate Source Excerpt (Critical)
  const excerpt = question.SourceExcerpt || question.sourceExcerpt;
  if (!excerpt || typeof excerpt !== "string") {
    isCriticalFailure = true;
    warnings.push("Critical: Missing source excerpt");
  } else if (excerpt.length < 20) {
    isCriticalFailure = true;
    warnings.push(`Critical: Source excerpt too short ("${excerpt}")`);
  } else if (/^\d+$/.test(excerpt.trim())) {
    // Catch cases where excerpt is just a number (like "100")
    isCriticalFailure = true;
    warnings.push(`Critical: Invalid source excerpt ("${excerpt}")`);
  }

  // 3. Validate Answer Match (Warning)
  // Only run if we have a valid excerpt
  let answerResult = { confidence: 100, warning: null };
  if (!isCriticalFailure) {
    answerResult = validateAnswer(question);
    // Add warning if validation fails or has warnings (both need the same handling)
    if (!answerResult.isValid || answerResult.warning) {
      warnings.push(answerResult.warning);
      overallConfidence = Math.min(overallConfidence, answerResult.confidence);
    }
  }

  return {
    isValid: !isCriticalFailure,
    isCriticalFailure,
    confidence: overallConfidence,
    warnings,
    details: {
      url: urlResult,
      answer: answerResult,
    },
  };
}
