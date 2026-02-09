/**
 * Firestore Performance Benchmark Script
 * Measures latency of key queries to verify Phase 1 optimizations.
 *
 * Usage: Load in browser console or run via test runner.
 */
import {
  getAllQuestionsFromFirestore,
  getUserTokenUsageAggregated,
  getQuestionStatsAggregated,
} from "../services/firebaseQueries";
import { logger } from "../utils/logger";

export const runFirestoreBenchmarks = async () => {
  logger.log("━━━━━ FIRESTORE BENCHMARKS ━━━━━");

  const scenarios = [
    {
      name: "Global Question Fetch (Limit 100)",
      fn: () => getAllQuestionsFromFirestore(100, true),
    },
    {
      name: "Aggregated Token Usage",
      fn: () => getUserTokenUsageAggregated("test-user-id"),
    },
    {
      name: "Aggregated Stats (Multi-query)",
      fn: () => getQuestionStatsAggregated(),
    },
  ];

  for (const scenario of scenarios) {
    const start = performance.now();
    try {
      await scenario.fn();
      const duration = Math.round(performance.now() - start);
      logger.log(`[PERF] ${scenario.name}: ${duration}ms`);
    } catch (error) {
      logger.error(`[PERF] ${scenario.name} FAILED:`, error);
    }
  }

  logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};
