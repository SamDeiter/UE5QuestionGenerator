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
  deleteQuestionFromFirestore,
} from "../services/firebase";
import { logQuestion } from "../utils/analyticsStore";
import { completeReviewTracking } from "../utils/normalizeQuestion";
import { getAgents } from "../agents";
import { logger } from "../utils/logger";

export const useQuestionManager = (config, showMessage) => {
  // Unified State: Single source of truth for ALL questions
  // Each question will have a `_source` property: 'session', 'import', 'database'
  const [allQuestions, setAllQuestions] = useState(() => {
    const saved = getSecureItem("ue5_gen_questions");
    if (saved && Array.isArray(saved)) {
      // Hydrate saved questions as 'session' source
      return saved.map((q) => ({ ...q, _source: "session" }));
    }
    return [];
  });

  // Derived arrays for backward compatibility and specific views
  // These are cheap filters on the main array
  const questions = useMemo(
    () => allQuestions.filter((q) => q._source === "session"),
    [allQuestions]
  );
  const historicalQuestions = useMemo(
    () => allQuestions.filter((q) => q._source === "import"),
    [allQuestions]
  );
  const databaseQuestions = useMemo(
    () => allQuestions.filter((q) => q._source === "database"),
    [allQuestions]
  );

  // Version tracking for concurrent editing (maps question ID -> version)
  const [questionVersions, setQuestionVersions] = useState(new Map());

  // Conflict resolution state
  const [conflictData, setConflictData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Persist session questions ONLY
  useEffect(() => {
    const sessionQuestions = allQuestions.filter(
      (q) => q._source === "session"
    );
    // Strip the internal _source tag before saving to avoid cluttering storage/exports
    // But keep it in memory. Actually, keeping it in storage is fine, but cleaner to strip.
    // Let's strip it to match previous behavior exactly.
    const cleanQuestions = sessionQuestions.map(({ _source, ...q }) => q);
    setSecureItem("ue5_gen_questions", cleanQuestions);
  }, [allQuestions]);

  // Sync questions across browser tabs via storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "ue5_gen_questions" && e.newValue) {
        try {
          const newSessionQuestions = JSON.parse(e.newValue).map((q) => ({
            ...q,
            _source: "session",
          }));
          logger.log(
            `🔄 Syncing ${newSessionQuestions.length} questions from another tab...`
          );

          // Update ONLY the session questions in the unified state
          setAllQuestions((prev) => {
            const nonSession = prev.filter((q) => q._source !== "session");
            return [...nonSession, ...newSessionQuestions];
          });
        } catch (err) {
          logger.error("Failed to sync questions from storage:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Backfill creatorName on questions missing it (Session only)
  useEffect(() => {
    if (!config.creatorName) return;

    // Check if any session questions need backfill
    const needsBackfill = allQuestions.some(
      (q) =>
        q._source === "session" &&
        (!q.creatorName ||
          q.creatorName === "N/A" ||
          q.creatorName === "Unknown")
    );

    if (needsBackfill) {
      setAllQuestions((prev) =>
        prev.map((q) => {
          if (
            q._source === "session" &&
            (!q.creatorName ||
              q.creatorName === "N/A" ||
              q.creatorName === "Unknown")
          ) {
            return { ...q, creatorName: config.creatorName };
          }
          return q;
        })
      );
    }
  }, [config.creatorName, allQuestions]);

  // Legacy Setters Compatibility Layer
  // These allow existing code to "set" a specific bucket without knowing about the unified state

  const setQuestions = useCallback((action) => {
    setAllQuestions((prev) => {
      const currentSession = prev.filter((q) => q._source === "session");
      const others = prev.filter((q) => q._source !== "session");

      let newSession;
      if (typeof action === "function") {
        newSession = action(currentSession);
      } else {
        newSession = action;
      }

      // Ensure new items are tagged correctly
      const taggedNewSession = newSession.map((q) => ({
        ...q,
        _source: "session",
      }));
      return [...others, ...taggedNewSession];
    });
  }, []);

  const setHistoricalQuestions = useCallback((action) => {
    setAllQuestions((prev) => {
      const currentImport = prev.filter((q) => q._source === "import");
      const others = prev.filter((q) => q._source !== "import");

      let newImport;
      if (typeof action === "function") {
        newImport = action(currentImport);
      } else {
        newImport = action;
      }

      const taggedNewImport = newImport.map((q) => ({
        ...q,
        _source: "import",
      }));
      return [...others, ...taggedNewImport];
    });
  }, []);

  const setDatabaseQuestions = useCallback((action) => {
    setAllQuestions((prev) => {
      const currentDb = prev.filter((q) => q._source === "database");
      const others = prev.filter((q) => q._source !== "database");

      let newDb;
      if (typeof action === "function") {
        newDb = action(currentDb);
      } else {
        newDb = action;
      }

      const taggedNewDb = newDb.map((q) => ({
        ...q,
        _source: "database",
      }));
      return [...others, ...taggedNewDb];
    });
  }, []);

  // Central question storage map - memoized for performance
  const allQuestionsMap = useMemo(() => {
    const newMap = new Map();

    allQuestions.forEach((q) => {
      const id = q.uniqueId || q.id;
      if (!id) return;
      if (!newMap.has(id)) newMap.set(id, []);

      const variants = newMap.get(id);
      const lang = q.language || "English";

      // Dedupe by language within each uniqueId bucket
      // Priority: session > import > database (if duplicates exist across sources)
      // Since we iterate allQuestions, the order depends on how they are merged.
      // But usually uniqueIds shouldn't overlap across sources unless it's the SAME question.
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

  // Helper to add questions with automatic cloud backup
  const addQuestionsToState = useCallback(
    async (newItems, source = "session", insertAfterId = null) => {
      // Normalize source
      // Legacy support: isHistory boolean -> 'import'
      let targetSource = source;
      if (source === true) targetSource = "import";
      if (source === false) targetSource = "session";

      // Auto-save session items to Firestore for crash protection
      if (targetSource === "session" && newItems && newItems.length > 0) {
        logger.log(
          `💾 Auto-saving ${newItems.length} questions to Firestore...`
        );
        const savePromises = newItems.map((q) =>
          saveQuestionToFirestore(q).catch((err) => {
            logger.warn(`⚠️ Failed to auto-save question ${q.uniqueId}:`, err);
          })
        );
        await Promise.all(savePromises);
        logger.log(`✓ Auto-saved ${newItems.length} questions to cloud`);
      }

      setAllQuestions((prev) => {
        // Tag new items
        const taggedNewItems = newItems.map((q) => ({
          ...q,
          _source: targetSource,
        }));

        // Filter duplicates against the SAME source
        // (We allow duplicates across sources e.g. imported same question as session)
        const currentSourceItems = prev.filter(
          (q) => q._source === targetSource
        );
        const otherSourceItems = prev.filter((q) => q._source !== targetSource);

        // Use helper to filter duplicates within this source
        // Note: passing empty array as 'otherList' because we only care about dupes in this source context for now
        // OR we can pass otherSourceItems if we want to prevent duplicates GLOBALLY.
        // Legacy behavior checked separation. Let's strict checking within source.
        const uniqueNew = filterDuplicateQuestions(
          taggedNewItems,
          currentSourceItems,
          []
        );

        logger.log(
          "🐛 [DEBUG] Adding to state:",
          uniqueNew.map((q) => ({
            id: q.uniqueId?.slice(0, 8),
            status: q.status,
            source: targetSource,
          }))
        );

        if (insertAfterId && uniqueNew.length > 0) {
          // Find index to insert after WITHIN the full array?
          // This is tricky with a unified array.
          // Strategy: Append to end, then sort?
          // Legacy added it to specific array.
          // Simplest approach: Just append. The UI sorts by date anyway.
          return [...prev, ...uniqueNew];
        }

        return [...prev, ...uniqueNew];
      });
    },
    []
  );

  // Helper to update question
  const updateQuestionInState = useCallback((id, updateFn) => {
    setAllQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx === -1) return prev; // Not found

      const newArr = [...prev];
      const updatedItem = updateFn(newArr[idx]);
      // Ensure source tag is preserved
      newArr[idx] = { ...updatedItem, _source: newArr[idx]._source };
      return newArr;
    });
  }, []);

  // Update ALL variants of a question (same uniqueId) with critique/metadata
  const updateAllVariantsInState = useCallback((uniqueId, updateFn) => {
    if (!uniqueId) {
      logger.warn("[updateAllVariantsInState] No uniqueId provided");
      return;
    }

    setAllQuestions((prev) =>
      prev.map((q) => (q.uniqueId === uniqueId ? updateFn(q) : q))
    );
  }, []);

  // Status update handler - now with version control and conflict resolution
  const handleUpdateStatus = useCallback(
    async (id, newStatus, rejectionReason = null) => {
      // Find the question in unified state
      // We look in allQuestions directly now
      // Find the question in unified state using the map/helper
      // We look in allQuestions directly now via allQuestionsMap which is derived from it

      const currentQ = allQuestionsMap.get(id)?.find((v) => v.id === id);

      if (!currentQ) {
        logger.warn(`handleUpdateStatus: Question ${id} not found`);
        return;
      }

      // Validate and normalize the document ID
      let docId = currentQ.id || currentQ.uniqueId;
      if (typeof docId === "number") {
        docId = String(docId);
      }

      if (!docId || typeof docId !== "string") {
        logger.error("Invalid question ID:", { currentQ, id, docId });
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
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));

          logQuestion({
            ...currentQ,
            status: "deleted",
            deletionReason: rejectionReason || "Status update to deleted",
            deletedAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error("Failed to delete question:", err);
          if (showMessage)
            showMessage("Failed to delete question from cloud.", 3000);
        }
        return;
      }

      // Calculate new state
      let updatedQ = { ...currentQ };

      if (newStatus === "accepted" || newStatus === "rejected") {
        if (!updatedQ.reviewStartedAt) {
          const estimatedStartTime = new Date(Date.now() - 30000);
          updatedQ = {
            ...updatedQ,
            reviewStartedAt: estimatedStartTime.toISOString(),
          };
        }
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
        const saveResult = await saveQuestionToFirestore(updatedQ);
        updateQuestionInState(id, () => updatedQ);

        if (saveResult.queued) {
          if (showMessage) showMessage("⚠️ Connection issue - queued.", 6000);
        } else if (
          showMessage &&
          (newStatus === "accepted" || newStatus === "rejected")
        ) {
          const statusLabel =
            newStatus === "accepted" ? "accepted" : "rejected";
          showMessage(`✓ Question ${statusLabel} and saved to cloud`, 2000);
        }
      } catch (err) {
        logger.error("Firestore sync failed:", err);
        if (err.message?.startsWith("QUESTION_DELETED:")) {
          logger.warn(`Question ${id} deleted from DB - removing local`);
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
          if (showMessage) showMessage("Question deleted from DB.", 4000);
          return;
        }

        if (showMessage) showMessage(`⚠️ Failed to save: ${err.message}`, 5000);
        updateQuestionInState(id, () => updatedQ);
      }
    },
    [
      allQuestionsMap, // dependency needed to find Q
      config.creatorName,
      showMessage,
      updateQuestionInState,
    ]
  );

  // Generic persisted update handler - now with version control
  const handleUpdateQuestion = useCallback(
    async (id, updates) => {
      const currentQ = allQuestionsMap.get(id)?.find((v) => v.id === id);

      if (!currentQ) {
        logger.warn(`handleUpdateQuestion: Question ${id} not found`);
        return;
      }

      let docId = currentQ.id || currentQ.uniqueId;
      if (typeof docId === "number") docId = String(docId);

      if (!docId || typeof docId !== "string") {
        logger.error("Invalid question ID:", { currentQ, id, docId });
        return;
      }

      const updatedQ = { ...currentQ, ...updates };
      const agents = getAgents();

      try {
        if (agents?.saveGuardAgent) {
          const baseVersion = questionVersions.get(id) || currentQ.version || 1;
          const result = await agents.saveGuardAgent.saveQuestion(
            docId,
            updates,
            baseVersion,
            config.userId || "unknown",
            config.userEmail || "unknown@example.com"
          );

          if (!result.success) {
            if (result.errorType === "VERSION_CONFLICT") {
              logger.warn("Version conflict detected");
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

          setQuestionVersions((prev) =>
            new Map(prev).set(id, result.newVersion)
          );
          updateQuestionInState(id, () => ({
            ...updatedQ,
            version: result.newVersion,
          }));
        } else {
          await saveQuestionToFirestore(updatedQ);
          updateQuestionInState(id, () => updatedQ);
        }
      } catch (err) {
        logger.error("Firestore sync failed:", err);
        if (err.message?.startsWith("QUESTION_DELETED:")) {
          setAllQuestions((prev) => prev.filter((q) => q.id !== id));
          if (showMessage) showMessage("Question deleted from DB.", 4000);
          return;
        }
        if (showMessage) showMessage(`⚠️ Failed to save: ${err.message}`, 4000);
        updateQuestionInState(id, () => updatedQ);
      }
    },
    [
      allQuestionsMap,
      questionVersions,
      config.userId,
      config.userEmail,
      updateQuestionInState,
      showMessage,
    ]
  );

  // Statistics
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

  // Unified List (Source of Truth for Counts) - Essentially just the Session + Import sorted naturally?
  // Previous logic did a complex merge.
  // With Unified State, "UnifiedQuestions" is basically... AllQuestions?
  // But legacy logic deduplicated across the 3 lists.
  // We've already unified them. So `unifiedQuestions` is just `allQuestions` (sorted).
  const unifiedQuestions = useMemo(() => {
    const all = [];
    const sortedUniqueIds = Array.from(allQuestionsMap.keys()).sort();

    sortedUniqueIds.forEach((uniqueId) => {
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
  const otherCount = useMemo(
    () =>
      unifiedQuestions.filter(
        (q) =>
          q.status &&
          q.status !== "pending" &&
          q.status !== "accepted" &&
          q.status !== "rejected"
      ).length,
    [unifiedQuestions]
  );

  const totalApproved = useMemo(() => {
    return CATEGORY_KEYS.reduce((sum, key) => sum + approvedCounts[key], 0);
  }, [approvedCounts]);

  const overallPercentage = useMemo(() => {
    return Math.min(100, (totalApproved / TARGET_TOTAL) * 100);
  }, [totalApproved]);

  const isTargetMet = useMemo(() => {
    const typeKey = config.type === "True/False" ? "T/F" : "MC";
    const categoryKey = `${config.difficulty} ${typeKey}`;
    const currentCount = approvedCounts[categoryKey] || 0;
    return currentCount >= TARGET_PER_CATEGORY;
  }, [config.difficulty, config.type, approvedCounts]);

  const maxBatchSize = useMemo(() => {
    const typeKey = config.type === "True/False" ? "T/F" : "MC";
    const categoryKey = `${config.difficulty} ${typeKey}`;
    const currentCount = approvedCounts[categoryKey] || 0;
    const remaining = TARGET_PER_CATEGORY - currentCount;
    return Math.min(30, Math.max(0, remaining));
  }, [config.difficulty, config.type, approvedCounts]);

  // Delete Handlers
  const handleDelete = useCallback((id) => setDeleteConfirmId(id), []);

  const confirmDelete = useCallback(
    async (reason = "Unknown") => {
      if (deleteConfirmId) {
        // Find from allQuestions
        const questionToDelete = allQuestions.find(
          (q) => q.id === deleteConfirmId
        );

        if (questionToDelete) {
          logQuestion({
            ...questionToDelete,
            status: "deleted",
            deletionReason: reason,
            deletedAt: new Date().toISOString(),
          });

          try {
            await deleteQuestionFromFirestore(
              questionToDelete.uniqueId || questionToDelete.id
            );
          } catch (err) {
            logger.error(
              "Failed to delete from Firestore during confirmDelete:",
              err
            );
          }
        }

        logger.log(`Deleting question ${deleteConfirmId}. Reason: ${reason}`);
        setAllQuestions((prev) => prev.filter((q) => q.id !== deleteConfirmId));
        if (showMessage) showMessage(`Question deleted: ${reason}`, 2000);
        setDeleteConfirmId(null);
      }
    },
    [deleteConfirmId, allQuestions, showMessage]
  );

  const handleDeleteAllQuestions = useCallback(() => {
    setShowClearModal(false);
    // Clear ONLY session questions, likely? Or ALL?
    // "handleDeleteAllQuestions" usually implies clearing the session.
    // Legacy behavior: questions and historical set to empty.
    // So we should remove 'session' and 'import'. Maybe keep 'database'?
    setAllQuestions((prev) => prev.filter((q) => q._source === "database"));
    if (showMessage) showMessage("Local session cleared.", 3000);
  }, [showMessage]);

  const checkAndStoreQuestions = useCallback(async (newQuestions) => {
    return newQuestions;
  }, []);

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
    otherCount,
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
    handleUpdateQuestion,
    conflictData,
    showConflictModal,
    setShowConflictModal,
  };
};
