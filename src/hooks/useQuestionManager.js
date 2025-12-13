import { useState, useEffect, useMemo, useCallback } from "react";
import { getSecureItem, setSecureItem } from "../utils/secureStorage";
import { filterDuplicateQuestions } from "../utils/questionHelpers";
import {
  CATEGORY_KEYS,
  TARGET_PER_CATEGORY,
  TARGET_TOTAL,
} from "../utils/constants";
import {
  saveQuestionToFirestore,
  getQuestionsPaginated,
} from "../services/firebase";
import { logQuestion } from "../utils/analyticsStore";

export const useQuestionManager = (config, showMessage) => {
  // Current session questions
  const [questions, setQuestions] = useState(() => {
    const saved = getSecureItem("ue5_gen_questions");
    return saved || [];
  });

  // Historical questions
  const [historicalQuestions, setHistoricalQuestions] = useState([]);

  // Database view questions
  const [databaseQuestions, setDatabaseQuestions] = useState([]);

  // PERFORMANCE: Pagination state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  // Central question storage map
  const [allQuestionsMap, setAllQuestionsMap] = useState(new Map());

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Persist session questions
  useEffect(() => setSecureItem("ue5_gen_questions", questions), [questions]);

  // Sync questions across browser tabs via storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "ue5_gen_questions" && e.newValue) {
        try {
          const newQuestions = JSON.parse(e.newValue);
          console.log(
            `🔄 Syncing ${newQuestions.length} questions from another tab...`
          );
          setQuestions(newQuestions);
        } catch (err) {
          console.error("Failed to sync questions from storage:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Backfill creatorName on questions missing it
  useEffect(() => {
    if (!config.creatorName) return; // No name to backfill with

    const questionsNeedingBackfill = questions.filter(
      (q) =>
        !q.creatorName || q.creatorName === "N/A" || q.creatorName === "Unknown"
    );
    if (questionsNeedingBackfill.length > 0) {
      console.log(
        `📝 Backfilling creatorName on ${questionsNeedingBackfill.length} questions...`
      );
      setQuestions((prev) =>
        prev.map((q) => {
          if (
            !q.creatorName ||
            q.creatorName === "N/A" ||
            q.creatorName === "Unknown"
          ) {
            return { ...q, creatorName: config.creatorName };
          }
          return q;
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.creatorName]); // Only run when creatorName changes

  // Recompute allQuestionsMap - include databaseQuestions for inventory tracking
  useEffect(() => {
    const combined = [
      ...questions,
      ...historicalQuestions,
      ...databaseQuestions,
    ];
    const newMap = new Map();
    combined.forEach((q) => {
      const id = q.uniqueId;
      if (!newMap.has(id)) newMap.set(id, []);
      // Dedupe by language within each uniqueId bucket to prevent double-counting
      const variants = newMap.get(id);
      const lang = q.language || "English";
      if (!variants.some((v) => (v.language || "English") === lang)) {
        variants.push(q);
      }
    });
    setAllQuestionsMap(newMap);
  }, [questions, historicalQuestions, databaseQuestions]);

  // Translation Map
  const translationMap = useMemo(() => {
    const map = new Map();
    Array.from(allQuestionsMap.keys()).forEach((uniqueId) => {
      const variants = allQuestionsMap.get(uniqueId);
      const langSet = new Set(variants.map((v) => v.language || "English"));
      map.set(uniqueId, langSet);
    });
    return map;
  }, [allQuestionsMap]);

  // Helper to add questions with automatic cloud backup
  const addQuestionsToState = useCallback(
    async (newItems, isHistory = false, insertAfterId = null) => {
      // Auto-save to Firestore for crash protection
      if (newItems && newItems.length > 0) {
        console.log(
          `💾 Auto-saving ${newItems.length} questions to Firestore...`
        );
        const savePromises = newItems.map((q) =>
          saveQuestionToFirestore(q).catch((err) => {
            console.warn(`⚠️ Failed to auto-save question ${q.uniqueId}:`, err);
          })
        );
        await Promise.all(savePromises);
        console.log(`✓ Auto-saved ${newItems.length} questions to cloud`);
      }

      const targetSet = isHistory ? setHistoricalQuestions : setQuestions;
      targetSet((prev) => {
        const otherList = isHistory ? questions : historicalQuestions;
        const uniqueNew = filterDuplicateQuestions(newItems, prev, otherList);

        if (insertAfterId && uniqueNew.length > 0) {
          // Find index to insert after
          const idx = prev.findIndex(
            (q) => q.id === insertAfterId || q.uniqueId === insertAfterId
          );
          if (idx !== -1) {
            const newArr = [...prev];
            newArr.splice(idx + 1, 0, ...uniqueNew);
            return newArr;
          }
        }

        return [...prev, ...uniqueNew];
      });
    },
    [questions, historicalQuestions]
  );

  // Helper to update question
  const updateQuestionInState = useCallback((id, updateFn) => {
    let foundInQuestions = false;
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx === -1) return prev;
      foundInQuestions = true;
      const newArr = [...prev];
      newArr[idx] = updateFn(newArr[idx]);
      return newArr;
    });

    if (!foundInQuestions) {
      setHistoricalQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === id);
        if (idx === -1) return prev;
        const newArr = [...prev];
        newArr[idx] = updateFn(newArr[idx]);
        return newArr;
      });
    }
  }, []);

  // Status update handler - now accepts optional rejection reason
  const handleUpdateStatus = useCallback(
    (id, newStatus, rejectionReason = null) => {
      updateQuestionInState(id, (q) => {
        const updatedQ = {
          ...q,
          status: newStatus,
          critique: newStatus === "accepted" ? null : q.critique,
          // Store rejection reason if provided
          rejectionReason: newStatus === "rejected" ? rejectionReason : null,
          rejectedAt:
            newStatus === "rejected" ? new Date().toISOString() : null,
        };

        // Sync to Firestore
        saveQuestionToFirestore(updatedQ).catch((err) =>
          console.error("Firestore sync failed:", err)
        );

        return updatedQ;
      });
    },
    [updateQuestionInState]
  );

  // Statistics - count both pending and accepted questions for generation target
  const approvedCounts = useMemo(() => {
    const counts = CATEGORY_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {}
    );
    const countedIds = new Set();

    Array.from(allQuestionsMap.values()).forEach((variants) => {
      const baseQ =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];

      // Count both pending and accepted questions for generation targets
      // This ensures newly generated questions update the counter immediately
      const isCountable =
        baseQ &&
        (baseQ.status === "accepted" ||
          baseQ.status === "pending" ||
          !baseQ.status) &&
        !countedIds.has(baseQ.uniqueId) &&
        baseQ.discipline === config.discipline;

      if (isCountable) {
        const typeAbbrev = baseQ.type === "True/False" ? "T/F" : "MC";
        const key = `${baseQ.difficulty} ${typeAbbrev}`;
        if (Object.prototype.hasOwnProperty.call(counts, key)) {
          counts[key]++;
          countedIds.add(baseQ.uniqueId);
        }
      }
    });
    return counts;
  }, [allQuestionsMap, config.discipline]);

  // Unified List (Source of Truth for Counts)
  const unifiedQuestions = useMemo(() => {
    const all = [];
    allQuestionsMap.forEach((variants) => {
      // Use the first variant or English version as the canonical entry
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (canonical) all.push(canonical);
    });

    // Sort by date (newest first)
    return all.sort(
      (a, b) =>
        new Date(b.created || b.dateAdded || 0) -
        new Date(a.created || a.dateAdded || 0)
    );
  }, [allQuestionsMap]);

  const approvedCount = useMemo(
    () => unifiedQuestions.filter((q) => q.status === "accepted").length,
    [unifiedQuestions]
  );
  const rejectedCount = useMemo(
    () => unifiedQuestions.filter((q) => q.status === "rejected").length,
    [unifiedQuestions]
  );
  const pendingCount = useMemo(
    () =>
      unifiedQuestions.filter((q) => !q.status || q.status === "pending")
        .length,
    [unifiedQuestions]
  );

  const totalApproved = useMemo(() => {
    return CATEGORY_KEYS.reduce((sum, key) => sum + approvedCounts[key], 0);
  }, [approvedCounts]);

  const overallPercentage = useMemo(() => {
    return Math.min(100, (totalApproved / TARGET_TOTAL) * 100);
  }, [totalApproved]);

  // Check if global quota is reached
  const isGlobalQuotaMet = useMemo(() => {
    return totalApproved >= TARGET_TOTAL;
  }, [totalApproved]);

  // Calculate per-difficulty totals (combining MC and T/F)
  const difficultyTotals = useMemo(() => {
    return {
      Easy:
        (approvedCounts["Easy MC"] || 0) + (approvedCounts["Easy T/F"] || 0),
      Medium:
        (approvedCounts["Medium MC"] || 0) +
        (approvedCounts["Medium T/F"] || 0),
      Hard:
        (approvedCounts["Hard MC"] || 0) + (approvedCounts["Hard T/F"] || 0),
    };
  }, [approvedCounts]);

  // Target per difficulty level (2 categories * TARGET_PER_CATEGORY = 66 per difficulty)
  const TARGET_PER_DIFFICULTY = TARGET_PER_CATEGORY * 2; // 66

  const isTargetMet = useMemo(() => {
    // Always block if global quota is reached
    if (isGlobalQuotaMet) return true;

    if (config.difficulty === "Balanced All") return false;

    // Check if this difficulty level is full (both MC + T/F combined)
    const currentCount = difficultyTotals[config.difficulty] || 0;
    return currentCount >= TARGET_PER_DIFFICULTY;
  }, [
    config.difficulty,
    difficultyTotals,
    isGlobalQuotaMet,
    TARGET_PER_DIFFICULTY,
  ]);

  const maxBatchSize = useMemo(() => {
    // If global quota is met, no generation allowed
    if (isGlobalQuotaMet) return 0;

    if (config.difficulty === "Balanced All") {
      const maxRemaining = Math.max(
        ...CATEGORY_KEYS.map((key) => TARGET_PER_CATEGORY - approvedCounts[key])
      );
      if (maxRemaining <= 0) return 0;
      return Math.min(30, Math.floor(TARGET_TOTAL / 6) * 6);
    } else {
      // Calculate remaining for this difficulty level
      const currentCount = difficultyTotals[config.difficulty] || 0;
      const remaining = TARGET_PER_DIFFICULTY - currentCount;
      // Also cap by remaining global quota
      const globalRemaining = TARGET_TOTAL - totalApproved;
      return Math.min(33, Math.max(0, remaining), Math.max(0, globalRemaining));
    }
  }, [
    config.difficulty,
    approvedCounts,
    difficultyTotals,
    isGlobalQuotaMet,
    totalApproved,
    TARGET_PER_DIFFICULTY,
  ]);

  // Delete Handlers
  const handleDelete = (id) => setDeleteConfirmId(id);

  const confirmDelete = (reason = "Unknown") => {
    if (deleteConfirmId) {
      // Find the question before deleting to log it
      const questionToDelete =
        allQuestionsMap.get(deleteConfirmId)?.[0] ||
        questions.find((q) => q.id === deleteConfirmId) ||
        historicalQuestions.find((q) => q.id === deleteConfirmId);

      if (questionToDelete) {
        logQuestion({
          ...questionToDelete,
          status: "deleted",
          deletionReason: reason,
          deletedAt: new Date().toISOString(),
        });
      }

      console.log(`Deleting question ${deleteConfirmId}. Reason: ${reason}`);
      setQuestions((prev) => prev.filter((q) => q.id !== deleteConfirmId));
      setHistoricalQuestions((prev) =>
        prev.filter((q) => q.id !== deleteConfirmId)
      );
      if (showMessage) showMessage(`Question deleted: ${reason}`, 2000);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteAllQuestions = () => {
    setShowClearModal(false);
    setQuestions([]);
    setHistoricalQuestions([]);
    if (showMessage) showMessage("Local session cleared.", 3000);
  };

  const checkAndStoreQuestions = async (newQuestions) => {
    return newQuestions;
  };

  // PERFORMANCE: Load more questions
  const _loadMoreQuestions = useCallback(
    async (userId) => {
      if (!hasMore || isLoadingMore) return;

      setIsLoadingMore(true);
      try {
        const {
          questions: moreQuestions,
          lastDoc: newLastDoc,
          hasMore: moreAvailable,
        } = await getQuestionsPaginated(userId, 20, lastDoc);

        setDatabaseQuestions((prev) => [...prev, ...moreQuestions]);
        setLastDoc(newLastDoc);
        setHasMore(moreAvailable);
      } catch (error) {
        console.error("Failed to load more questions:", error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore, isLoadingMore, lastDoc]
  );

  return {
    questions,
    setQuestions,
    historicalQuestions,
    setHistoricalQuestions,
    databaseQuestions,
    setDatabaseQuestions,
    allQuestionsMap,
    translationMap,
    addQuestionsToState,
    updateQuestionInState,
    handleUpdateStatus,
    approvedCounts,
    approvedCount,
    rejectedCount,
    pendingCount,
    totalApproved,
    overallPercentage,
    isTargetMet,
    maxBatchSize,
    deleteConfirmId,
    setDeleteConfirmId,
    showClearModal,
    setShowClearModal,
    handleDelete,
    confirmDelete,
    handleDeleteAllQuestions,
    checkAndStoreQuestions,
    unifiedQuestions,
  };
};
