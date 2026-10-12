/**
 * Question Snapshot Service
 *
 * Loads a pre-built static copy of the question database
 * (`question-snapshot.json`, produced by scripts/export-question-snapshot.mjs
 * and served with the app). A cold browser (empty IndexedDB) can then start
 * from the snapshot and only ask Firestore for docs changed since it was
 * generated, instead of reading the entire collection (~19.5k reads).
 *
 * The snapshot is optional: if the file is missing or invalid this returns
 * null and the caller falls back to the normal full Firestore sync.
 *
 * @module services/questionSnapshot
 */

import { logger } from "../utils/logger";
import { parseQuestionDoc } from "../utils/questionDocParser";

const SNAPSHOT_FILE = "question-snapshot.json";

/**
 * @returns {Promise<{questions: Array<Object>, generatedAtMs: number}|null>}
 */
export const loadQuestionSnapshot = async () => {
  try {
    const url = `${import.meta.env.BASE_URL || "/"}${SNAPSHOT_FILE}`;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;

    // Guard against SPA hosts that answer unknown paths with index.html
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) return null;

    const data = await res.json();
    if (
      !data ||
      typeof data.generatedAtMs !== "number" ||
      !Array.isArray(data.docs) ||
      data.docs.length === 0
    ) {
      return null;
    }

    const questions = [];
    for (const doc of data.docs) {
      const result = parseQuestionDoc(doc);
      if (result.valid) questions.push(result.question);
    }

    logger.log(
      `📦 Question snapshot: ${questions.length} questions (generated ${new Date(
        data.generatedAtMs
      ).toISOString()})`
    );
    return { questions, generatedAtMs: data.generatedAtMs };
  } catch (error) {
    logger.warn("Question snapshot unavailable, using Firestore:", error);
    return null;
  }
};
