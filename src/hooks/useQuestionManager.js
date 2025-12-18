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
  deleteQuestionFromFirestore,
} from "../services/firebase";
import { logQuestion } from "../utils/analyticsStore";
import { completeReviewTracking } from "../utils/normalizeQuestion";
import { getAgents } from "../agents";

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

  // Version tracking for concurrent editing (maps question ID -> version)
  const [questionVersions, setQuestionVersions] = useState(new Map());

  // Conflict resolution state
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Get concurrent editing agents
  const agents = getAgents();

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

        // DEBUG: Log questions being added to state
        console.log(
          "🐛 [DEBUG] Adding to state:",
          uniqueNew.map((q) => ({
            id: q.uniqueId?.slice(0, 8),
            status: q.status,
          }))
        );

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

  // Update ALL variants of a question (same uniqueId) with critique/metadata
  const updateAllVariantsInState = useCallback((uniqueId, updateFn) => {
    if (!uniqueId) {
      console.warn("[updateAllVariantsInState] No uniqueId provided");
      return;
    }

    console.log(
      `[updateAllVariantsInState] Updating all variants for uniqueId: ${uniqueId}`
    );

    // Update in questions array
    setQuestions((prev) => {
      let updatedCount = 0;
      const newArr = prev.map((q) => {
        if (q.uniqueId === uniqueId) {
          updatedCount++;
          return updateFn(q);
        }
        return q;
      });
      console.log(
        `[updateAllVariantsInState] Updated ${updatedCount} variants in questions`
      );
      return newArr;
    });

    // Also update in historicalQuestions
    setHistoricalQuestions((prev) => {
      let updatedCount = 0;
      const newArr = prev.map((q) => {
        if (q.uniqueId === uniqueId) {
          updatedCount++;
          return updateFn(q);
        }
        return q;
      });
      if (updatedCount > 0) {
        console.log(
          `[updateAllVariantsInState] Updated ${updatedCount} variants in historicalQuestions`
        );
      }
      return newArr;
    });
  }, []);

  // Status update handler - now with version control and conflict resolution
  const handleUpdateStatus = useCallback(
    async (id, newStatus, rejectionReason = null) => {
      // Find the question
      const variants = allQuestionsMap.get(id) || [];
      const currentQ =
        variants.find((v) => v.id === id) ||
        questions.find((q) => q.id === id) ||
        historicalQuestions.find((q) => q.id === id);

      if (!currentQ) {
        console.warn(`handleUpdateStatus: Question ${id} not found`);
        return;
      }

      // Validate that we have a valid document ID
      const docId = currentQ.id || currentQ.uniqueId;
      if (!docId || typeof docId !== "string") {
        console.error("Invalid question ID:", { currentQ, id, docId });
        if (showMessage) {
          showMessage(
            "⚠️ Cannot save: Question has invalid ID. Please refresh the page.",
            5000
          );
        }
        return;
      }

      // SPECIAL CASE: Hard Delete if status is 'deleted'
      if (newStatus === "deleted") {
        try {
          await deleteQuestionFromFirestore(currentQ.uniqueId || currentQ.id);
          setQuestions((prev) => prev.filter((q) => q.id !== id));
          setHistoricalQuestions((prev) => prev.filter((q) => q.id !== id));
          logQuestion({
            ...currentQ,
            status: "deleted",
            deletionReason: rejectionReason || "Status update to deleted",
            deletedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Failed to delete question:", err);
          if (showMessage)
            showMessage("Failed to delete question from cloud.", 3000);
        }
        return;
      }

      // Calculate new state
      let updatedQ = { ...currentQ };
      if (
        (newStatus === "accepted" || newStatus === "rejected") &&
        currentQ.reviewStartedAt
      ) {
        updatedQ = completeReviewTracking(updatedQ, config.creatorName);
      }

      updatedQ = {
        ...updatedQ,
        status: newStatus,
        critique: newStatus === "accepted" ? null : updatedQ.critique,
        rejectionReason: newStatus === "rejected" ? rejectionReason : null,
        rejectedAt: newStatus === "rejected" ? new Date().toISOString() : null,
        acceptedAt:
          newStatus === "accepted"
            ? new Date().toISOString()
            : updatedQ.acceptedAt,
      };

      try {
        // Use SaveGuard Agent if available, otherwise fall back to direct save
        if (agents?.saveGuardAgent) {
          const baseVersion = questionVersions.get(id) || currentQ.version || 1;
          const result = await agents.saveGuardAgent.saveQuestionStatus(
            docId, // Use validated document ID
            newStatus,
            baseVersion,
            config.userId || "unknown",
            config.userEmail || "unknown@example.com",
            {
              rejectionReason,
              reviewedBy: config.creatorName,
              reviewedAt: new Date().toISOString(),
            }
          );

          if (!result.success) {
            if (result.errorType === "VERSION_CONFLICT") {
              console.warn("Version conflict detected during status update");
              setConflictData({
                serverQuestion: result.serverQuestion,
                serverVersion: result.serverVersion,
                localChanges: updatedQ,
                expectedVersion: baseVersion,
              });
              setShowConflictModal(true);
              return;
            }
            throw new Error(result.error || "Save failed");
          }

          // Update version tracking
          setQuestionVersions((prev) =>
            new Map(prev).set(id, result.newVersion)
          );

          // Update local state with new version
          updateQuestionInState(id, () => ({
            ...updatedQ,
            version: result.newVersion,
          }));
        } else {
          // Fallback: Direct save (no version control)
          await saveQuestionToFirestore(updatedQ);
          updateQuestionInState(id, () => updatedQ);
        }

        if (
          showMessage &&
          (newStatus === "accepted" || newStatus === "rejected")
        ) {
          const statusLabel =
            newStatus === "accepted" ? "accepted" : "rejected";
          showMessage(`✓ Question ${statusLabel} and saved to cloud`, 2000);
        }
      } catch (err) {
        console.error("Firestore sync failed:", err);
        if (showMessage) {
          showMessage(
            `⚠️ Failed to save to cloud: ${err.message}. Question saved locally only.`,
            5000
          );
        }
        updateQuestionInState(id, () => updatedQ);
      }
    },
    [
      updateQuestionInState,
      config.creatorName,
      config.userId,
      config.userEmail,
      allQuestionsMap,
      questions,
      historicalQuestions,
      agents,
      questionVersions,
      showMessage,
    ]
  );

  // Generic persisted update handler - now with version control
  const handleUpdateQuestion = useCallback(
    async (id, updates) => {
      // Find the question
      const variants = allQuestionsMap.get(id) || [];
      const currentQ =
        variants.find((v) => v.id === id) ||
        questions.find((q) => q.id === id) ||
        historicalQuestions.find((q) => q.id === id);

      if (!currentQ) {
        console.warn(`handleUpdateQuestion: Question ${id} not found`);
        return;
      }

      // Validate that we have a valid document ID
      const docId = currentQ.id || currentQ.uniqueId;
      if (!docId || typeof docId !== "string") {
        console.error("Invalid question ID:", { currentQ, id, docId });
        if (showMessage) {
          showMessage(
            "⚠️ Cannot save: Question has invalid ID. Please refresh the page.",
            5000
          );
        }
        return;
      }

      const updatedQ = { ...currentQ, ...updates };

      try {
        // Use SaveGuard Agent if available
        if (agents?.saveGuardAgent) {
          const baseVersion = questionVersions.get(id) || currentQ.version || 1;
          const result = await agents.saveGuardAgent.saveQuestion(
            docId, // Use validated document ID
            updates,
            baseVersion,
            config.userId || "unknown",
            config.userEmail || "unknown@example.com"
          );

          if (!result.success) {
            if (result.errorType === "VERSION_CONFLICT") {
              console.warn("Version conflict detected during question update");
              setConflictData({
                serverQuestion: result.serverQuestion,
                serverVersion: result.serverVersion,
                localChanges: updates,
                expectedVersion: baseVersion,
              });
              setShowConflictModal(true);
              return;
            }
            throw new Error(result.error || "Save failed");
          }

          // Update version tracking
          setQuestionVersions((prev) =>
            new Map(prev).set(id, result.newVersion)
          );

          // Update local state with new version
          updateQuestionInState(id, () => ({
            ...updatedQ,
            version: result.newVersion,
          }));
        } else {
          // Fallback: Direct save
          await saveQuestionToFirestore(updatedQ);
          updateQuestionInState(id, () => updatedQ);
        }
      } catch (err) {
        console.error("Firestore sync failed:", err);
        if (showMessage) {
          showMessage(
            `⚠️ Failed to save changes to cloud: ${err.message}`,
            4000
          );
        }
        updateQuestionInState(id, () => updatedQ);
      }
    },
    [
      updateQuestionInState,
      allQuestionsMap,
      questions,
      historicalQuestions,
      config.userId,
      config.userEmail,
      agents,
      questionVersions,
      showMessage,
    ]
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

    // FIX: Sort uniqueIds to ensure stable iteration order
    // Map.forEach() can have unstable order when Map is mutated
    const sortedUniqueIds = Array.from(allQuestionsMap.keys()).sort();

    sortedUniqueIds.forEach((uniqueId) => {
      const variants = allQuestionsMap.get(uniqueId);
      // Use the first variant or English version as the canonical entry
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (canonical) all.push(canonical);
    });

    // Sort by date (newest first), with uniqueId as tiebreaker for stability
    return all.sort((a, b) => {
      const dateA = new Date(a.created || a.dateAdded || 0).getTime();
      const dateB = new Date(b.created || b.dateAdded || 0).getTime();

      // Primary sort: date (newest first)
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // Tiebreaker: uniqueId (alphabetical) for fully stable sort
      return (a.uniqueId || "").localeCompare(b.uniqueId || "");
    });
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

  // Check if global quota is reached (kept for informational purposes)
  const _isGlobalQuotaMet = useMemo(() => {
    return totalApproved >= TARGET_TOTAL;
  }, [totalApproved]);

  // Calculate per-difficulty totals (combining MC and T/F)
  const _difficultyTotals = useMemo(() => {
    return {
      Beginner:
        (approvedCounts["Beginner MC"] || 0) +
        (approvedCounts["Beginner T/F"] || 0),
      Intermediate:
        (approvedCounts["Intermediate MC"] || 0) +
        (approvedCounts["Intermediate T/F"] || 0),
      Expert:
        (approvedCounts["Expert MC"] || 0) +
        (approvedCounts["Expert T/F"] || 0),
    };
  }, [approvedCounts]);

  // Target per difficulty level (2 categories * TARGET_PER_CATEGORY = 66 per difficulty)
  const _TARGET_PER_DIFFICULTY = TARGET_PER_CATEGORY * 2; // 66

  const isTargetMet = useMemo(() => {
    // Only block if the selected type for this difficulty is full
    // Global quota blocking is handled by validateGeneration() which
    // checks individual category limits properly
    const typeKey = config.type === "True/False" ? "T/F" : "MC";
    const categoryKey = `${config.difficulty} ${typeKey}`;
    const currentCount = approvedCounts[categoryKey] || 0;
    return currentCount >= TARGET_PER_CATEGORY;
  }, [config.difficulty, config.type, approvedCounts]);

  const maxBatchSize = useMemo(() => {
    // Calculate remaining for this specific type only
    // validateGeneration() handles cross-category logic
    const typeKey = config.type === "True/False" ? "T/F" : "MC";
    const categoryKey = `${config.difficulty} ${typeKey}`;
    const currentCount = approvedCounts[categoryKey] || 0;
    const remaining = TARGET_PER_CATEGORY - currentCount;
    return Math.min(30, Math.max(0, remaining));
  }, [config.difficulty, config.type, approvedCounts]);

  // Delete Handlers
  // Delete Handlers
  const handleDelete = useCallback((id) => setDeleteConfirmId(id), []);

  const confirmDelete = useCallback(
    async (reason = "Unknown") => {
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

          // Perform Hard Delete from Firestore
          try {
            await deleteQuestionFromFirestore(
              questionToDelete.uniqueId || questionToDelete.id
            );
          } catch (err) {
            // Safe to ignore re-renders here as it's an async error handling
            console.error(
              "Failed to delete from Firestore during confirmDelete:",
              err
            );
          }
        }

        console.log(`Deleting question ${deleteConfirmId}. Reason: ${reason}`);
        setQuestions((prev) => prev.filter((q) => q.id !== deleteConfirmId));
        setHistoricalQuestions((prev) =>
          prev.filter((q) => q.id !== deleteConfirmId)
        );
        if (showMessage) showMessage(`Question deleted: ${reason}`, 2000);
        setDeleteConfirmId(null);
      }
    },
    [
      deleteConfirmId,
      allQuestionsMap,
      questions,
      historicalQuestions,
      showMessage,
    ]
  );

  const handleDeleteAllQuestions = useCallback(() => {
    setShowClearModal(false);
    setQuestions([]);
    setHistoricalQuestions([]);
    if (showMessage) showMessage("Local session cleared.", 3000);
  }, [showMessage]);

  const checkAndStoreQuestions = useCallback(async (newQuestions) => {
    return newQuestions;
  }, []);

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
    updateAllVariantsInState,
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
    handleUpdateQuestion, // Added persistent update handler
    // Concurrent editing conflict resolution
    conflictData,
    showConflictModal,
    setShowConflictModal,
  };
};
