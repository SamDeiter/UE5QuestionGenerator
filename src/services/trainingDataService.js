/**
 * Training Data Service
 *
 * Manages collection of AI training data (correction pairs):
 * - Saves original vs. corrected question pairs
 * - Exports data in JSONL format for Vertex AI fine-tuning
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { getDb, auth } from "./firebase";
import { logger } from "../utils/logger";

/**
 * Save a training pair (original vs. corrected question)
 * @param {Object} original - Original question before correction
 * @param {Object} corrected - Corrected/improved question
 * @param {string} correctionType - Type of correction (e.g., "question_text", "options", "answer")
 * @returns {Promise<{success: boolean, docId?: string, error?: string}>}
 */
export const saveTrainingPair = async (
  original,
  corrected,
  correctionType = "general"
) => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const trainingData = {
      // Original question data
      original: {
        question: original.question,
        options: original.options,
        correct: original.correct,
        discipline: original.discipline,
        difficulty: original.difficulty,
        type: original.type,
      },
      // Corrected question data
      corrected: {
        question: corrected.question,
        options: corrected.options,
        correct: corrected.correct,
        discipline: corrected.discipline,
        difficulty: corrected.difficulty,
        type: corrected.type,
      },
      // Metadata
      correctionType,
      originalQuestionId: original.uniqueId,
      correctedBy: auth.currentUser.uid,
      correctedByEmail: auth.currentUser.email,
      correctedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(getDb(), "training_data"),
      trainingData
    );

    logger.log(`✅ Training pair saved: ${docRef.id}`);
    return { success: true, docId: docRef.id };
  } catch (error) {
    logger.error("Failed to save training pair:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Export training data in JSONL format for Vertex AI fine-tuning
 * Format: {"input": "original question prompt", "output": "corrected question"}
 * @param {number} maxRecords - Maximum number of records to export
 * @returns {Promise<{success: boolean, data?: string, count?: number, error?: string}>}
 */
const exportTrainingData = async (maxRecords = 1000) => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const trainingQuery = query(
      collection(getDb(), "training_data"),
      orderBy("correctedAt", "desc"),
      limit(maxRecords)
    );

    const snapshot = await getDocs(trainingQuery);
    const records = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Format for Vertex AI fine-tuning
      const record = {
        input: formatQuestionPrompt(data.original),
        output: formatQuestionOutput(data.corrected),
        metadata: {
          id: doc.id,
          correctionType: data.correctionType,
          discipline: data.original.discipline,
        },
      };

      records.push(record);
    });

    // Convert to JSONL format (one JSON object per line)
    const jsonl = records.map((r) => JSON.stringify(r)).join("\n");

    return { success: true, data: jsonl, count: records.length };
  } catch (error) {
    logger.error("Failed to export training data:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Format original question as a prompt for fine-tuning input
 */
const formatQuestionPrompt = (q) => {
  return `Generate a ${q.difficulty || "Medium"} difficulty ${
    q.type || "Multiple Choice"
  } question about ${q.discipline || "UE5"}.

Original:
Question: ${q.question}
A: ${q.options?.A || ""}
B: ${q.options?.B || ""}
C: ${q.options?.C || ""}
D: ${q.options?.D || ""}
Correct: ${q.correct}

Please improve this question.`;
};

/**
 * Format corrected question as expected output for fine-tuning
 */
const formatQuestionOutput = (q) => {
  return `Question: ${q.question}
A: ${q.options?.A || ""}
B: ${q.options?.B || ""}
C: ${q.options?.C || ""}
D: ${q.options?.D || ""}
Correct: ${q.correct}`;
};

/**
 * Download training data as JSONL file
 */
export const downloadTrainingDataAsFile = async () => {
  const result = await exportTrainingData();

  if (!result.success) {
    throw new Error(result.error);
  }

  const blob = new Blob([result.data], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ue5-training-data-${
    new Date().toISOString().split("T")[0]
  }.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, count: result.count };
};

/**
 * Export rejected questions as negative training examples
 * These are questions that reviewers marked as rejected - useful for teaching
 * the model what NOT to generate.
 *
 * @param {number} maxRecords - Maximum number of records to export
 * @returns {Promise<{success: boolean, data?: string, count?: number, error?: string}>}
 */
const exportRejectedQuestions = async (maxRecords = 500) => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    // Query questions with status "rejected"
    const rejectedQuery = query(
      collection(getDb(), "questions"),
      orderBy("lastModified", "desc"),
      limit(maxRecords)
    );

    const snapshot = await getDocs(rejectedQuery);
    const records = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Only include rejected questions
      if (data.status !== "rejected") return;

      // Format as negative example
      const record = {
        input: `Generate a ${data.difficulty || "Medium"} difficulty ${
          data.type || "Multiple Choice"
        } question about ${data.discipline || "UE5"}.`,
        output: formatQuestionOutput({
          question: data.question,
          options: data.options,
          correct: data.correct,
        }),
        metadata: {
          id: doc.id,
          type: "rejected",
          reason:
            data.reviewFeedback || data.rejectionReason || "Quality issue",
          discipline: data.discipline,
          isNegativeExample: true,
        },
      };

      records.push(record);
    });

    // Convert to JSONL format
    const jsonl = records.map((r) => JSON.stringify(r)).join("\\n");

    return { success: true, data: jsonl, count: records.length };
  } catch (error) {
    logger.error("Failed to export rejected questions:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Download all training data (corrections + rejected) as JSONL file
 */
export const downloadAllTrainingData = async () => {
  // Get correction pairs
  const corrections = await exportTrainingData();
  // Get rejected questions
  const rejected = await exportRejectedQuestions();

  if (!corrections.success && !rejected.success) {
    throw new Error("Failed to export any training data");
  }

  // Combine both datasets
  const allData = [];
  if (corrections.success && corrections.data) {
    allData.push(corrections.data);
  }
  if (rejected.success && rejected.data) {
    allData.push(rejected.data);
  }

  const combinedJsonl = allData.join("\\n");
  const totalCount = (corrections.count || 0) + (rejected.count || 0);

  const blob = new Blob([combinedJsonl], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ue5-all-training-data-${
    new Date().toISOString().split("T")[0]
  }.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    count: totalCount,
    corrections: corrections.count || 0,
    rejected: rejected.count || 0,
  };
};
