import { useMemo } from "react";
// import { QUOTA_TARGETS } from "../useQuestionManager"; // Removed unused import causing circular dependency error
import { QUESTION_SOURCES, QUESTION_STATUS } from "../../utils/constants";
import {
  CATEGORY_KEYS,
  TARGET_TOTAL,
  TARGET_PER_CATEGORY,
} from "../../utils/constants";

/**
 * Hook for deriving various views, maps, and statistics from the main allQuestions state.
 * v2.4.33: Merges server-side categoryStats and globalStats for accurate progress tracking.
 */
export const useQuestionDerivedData = (
  allQuestions,
  config,
  categoryStats = {},
  globalStats = null
) => {
  // Derived arrays for specific sources
  const questions = useMemo(
    () => allQuestions.filter((q) => q._source === QUESTION_SOURCES.SESSION),
    [allQuestions]
  );

  const historicalQuestions = useMemo(
    () => allQuestions.filter((q) => q._source === QUESTION_SOURCES.IMPORT),
    [allQuestions]
  );

  const databaseQuestions = useMemo(
    () => allQuestions.filter((q) => q._source === QUESTION_SOURCES.DATABASE),
    [allQuestions]
  );

  // Central question storage map - memoized for performance
  const allQuestionsMap = useMemo(() => {
    const newMap = new Map();

    allQuestions.forEach((q) => {
      const id = q.uniqueId || q.id;
      if (!id) return;
      if (!newMap.has(id)) newMap.set(id, []);

      const variants = newMap.get(id);
      const lang = q.language || "English";

      if (!variants.some((v) => (v.language || "English") === lang)) {
        variants.push(q);
      }
    });

    return newMap;
  }, [allQuestions]);

  // Translation Map - derived from the stable allQuestionsMap
  const translationMap = useMemo(() => {
    const map = new Map();
    Array.from(allQuestionsMap.keys()).forEach((uniqueId) => {
      const variants = allQuestionsMap.get(uniqueId);
      const langSet = new Set(variants.map((v) => v.language || "English"));
      map.set(uniqueId, langSet);
    });
    return map;
  }, [allQuestionsMap]);

  // Unified List (Canonical view for counts)
  const unifiedQuestions = useMemo(() => {
    const all = [];
    Array.from(allQuestionsMap.keys()).forEach((uniqueId) => {
      const variants = allQuestionsMap.get(uniqueId);
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (canonical) all.push(canonical);
    });

    return all.sort((a, b) => {
      const dateA = new Date(a.created || a.dateAdded || 0).getTime();
      const dateB = new Date(b.created || b.dateAdded || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (a.uniqueId || "").localeCompare(b.uniqueId || "");
    });
  }, [allQuestionsMap]);

  // Flat list of ALL variants (every language). Used by features that need
  // the cross-language picture — e.g. the SCORM export modal's per-language
  // checkbox list. unifiedQuestions intentionally collapses each uniqueId
  // to one canonical row, so it's the wrong source for that surface.
  const allLanguageQuestions = useMemo(() => {
    const all = [];
    Array.from(allQuestionsMap.values()).forEach((variants) => {
      variants.forEach((v) => all.push(v));
    });
    return all;
  }, [allQuestionsMap]);

  // Statistics (Discipline-specific)
  const approvedCounts = useMemo(() => {
    const counts = CATEGORY_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {}
    );

    unifiedQuestions.forEach((q) => {
      if (
        (q.status === QUESTION_STATUS.ACCEPTED ||
          q.status === QUESTION_STATUS.PENDING ||
          !q.status) &&
        q.discipline === config.discipline
      ) {
        const typeAbbrev = q.type === "True/False" ? "T/F" : "MC";
        const key = `${q.difficulty} ${typeAbbrev}`;
        if (Object.hasOwn(counts, key)) {
          counts[key]++;
        }
      }
    });

    // Merge with server-side "Ground Truth" counts (discipline-specific)
    Object.keys(categoryStats).forEach((key) => {
      if (Object.hasOwn(counts, key)) {
        counts[key] = Math.max(counts[key], categoryStats[key]);
      }
    });

    return counts;
  }, [unifiedQuestions, config.discipline, categoryStats]);

  // Global Status Counts (for overall progress)
  const approvedCount = useMemo(() => {
    if (globalStats?.byStatus?.accepted !== undefined) {
      return globalStats.byStatus.accepted;
    }
    return unifiedQuestions.filter((q) => q.status === QUESTION_STATUS.ACCEPTED)
      .length;
  }, [unifiedQuestions, globalStats]);

  const rejectedCount = useMemo(() => {
    if (globalStats?.byStatus?.rejected !== undefined) {
      return globalStats.byStatus.rejected;
    }
    return unifiedQuestions.filter((q) => q.status === QUESTION_STATUS.REJECTED)
      .length;
  }, [unifiedQuestions, globalStats]);

  const pendingCount = useMemo(() => {
    if (globalStats?.byStatus?.pending !== undefined) {
      return globalStats.byStatus.pending;
    }
    return unifiedQuestions.filter(
      (q) => !q.status || q.status === QUESTION_STATUS.PENDING
    ).length;
  }, [unifiedQuestions, globalStats]);

  const otherCount = useMemo(() => {
    if (globalStats?.byStatus) {
      // Calculate from globalStats if available
      const known = ["accepted", "rejected", "pending"];
      return Object.entries(globalStats.byStatus)
        .filter(([status]) => !known.includes(status))
        .reduce((sum, [, count]) => sum + count, 0);
    }
    return unifiedQuestions.filter(
      (q) => q.status && !["accepted", "rejected", "pending"].includes(q.status)
    ).length;
  }, [unifiedQuestions, globalStats]);

  const totalApproved = useMemo(() => {
    // If we have global approved count, use it. Otherwise fallback to discipline-specific sum.
    // NOTE: Sidebar usually prefers overall count, so this is correct.
    if (globalStats?.byStatus?.accepted !== undefined) {
      return globalStats.byStatus.accepted;
    }
    return Object.values(approvedCounts).reduce((a, b) => a + b, 0);
  }, [approvedCounts, globalStats]);

  const overallPercentage = useMemo(
    () => Math.min(100, (totalApproved / TARGET_TOTAL) * 100),
    [totalApproved]
  );

  const isTargetMet = useMemo(() => {
    const typeKey = config.type === "True/False" ? "T/F" : "MC";
    const categoryKey = `${config.difficulty} ${typeKey}`;
    return (approvedCounts[categoryKey] || 0) >= TARGET_PER_CATEGORY;
  }, [config.difficulty, config.type, approvedCounts]);

  return {
    questions,
    historicalQuestions,
    databaseQuestions,
    allQuestionsMap,
    translationMap,
    unifiedQuestions,
    allLanguageQuestions,
    approvedCounts,
    approvedCount,
    rejectedCount,
    pendingCount,
    otherCount,
    totalApproved,
    overallPercentage,
    isTargetMet,
  };
};
