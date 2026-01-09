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
 */
export const useQuestionDerivedData = (allQuestions, config) => {
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

  // Statistics
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
    return counts;
  }, [unifiedQuestions, config.discipline]);

  const approvedCount = useMemo(
    () =>
      unifiedQuestions.filter((q) => q.status === QUESTION_STATUS.ACCEPTED)
        .length,
    [unifiedQuestions]
  );
  const rejectedCount = useMemo(
    () =>
      unifiedQuestions.filter((q) => q.status === QUESTION_STATUS.REJECTED)
        .length,
    [unifiedQuestions]
  );
  const pendingCount = useMemo(
    () =>
      unifiedQuestions.filter(
        (q) => !q.status || q.status === QUESTION_STATUS.PENDING
      ).length,
    [unifiedQuestions]
  );
  const otherCount = useMemo(
    () =>
      unifiedQuestions.filter(
        (q) =>
          q.status && !["accepted", "rejected", "pending"].includes(q.status)
      ).length,
    [unifiedQuestions]
  );

  const totalApproved = useMemo(
    () => Object.values(approvedCounts).reduce((a, b) => a + b, 0),
    [approvedCounts]
  );
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
