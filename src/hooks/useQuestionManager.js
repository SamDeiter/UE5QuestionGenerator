import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';
import { filterDuplicateQuestions } from '../utils/helpers';
import { CATEGORY_KEYS, TARGET_PER_CATEGORY, TARGET_TOTAL } from '../utils/constants';
import { saveQuestionToFirestore, getQuestionsPaginated } from '../services/firebase';
import { logQuestion } from '../utils/analyticsStore';

export const useQuestionManager = (config, showMessage) => {
    // Current session questions
    const [questions, setQuestions] = useState(() => {
        const saved = getSecureItem('ue5_gen_questions');
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
    useEffect(() => setSecureItem('ue5_gen_questions', questions), [questions]);

    // Sync questions across browser tabs via storage event
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'ue5_gen_questions' && e.newValue) {
                try {
                    const newQuestions = JSON.parse(e.newValue);
                    console.log(`🔄 Syncing ${newQuestions.length} questions from another tab...`);
                    setQuestions(newQuestions);
                } catch (err) {
                    console.error('Failed to sync questions from storage:', err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Backfill creatorName on questions missing it
    useEffect(() => {
        if (!config.creatorName) return; // No name to backfill with

        const questionsNeedingBackfill = questions.filter(q => !q.creatorName || q.creatorName === 'N/A' || q.creatorName === 'Unknown');
        if (questionsNeedingBackfill.length > 0) {
            console.log(`📝 Backfilling creatorName on ${questionsNeedingBackfill.length} questions...`);
            setQuestions(prev => prev.map(q => {
                if (!q.creatorName || q.creatorName === 'N/A' || q.creatorName === 'Unknown') {
                    return { ...q, creatorName: config.creatorName };
                }
                return q;
            }));
        }
    }, [config.creatorName]); // Only run when creatorName changes

    // Recompute allQuestionsMap
    useEffect(() => {
        const combined = [...questions, ...historicalQuestions];
        const newMap = new Map();
        combined.forEach(q => {
            const id = q.uniqueId;
            if (!newMap.has(id)) newMap.set(id, []);
            newMap.get(id).push(q);
        });
        setAllQuestionsMap(newMap);
    }, [questions, historicalQuestions]);

    // Translation Map
    const translationMap = useMemo(() => {
        const map = new Map();
        Array.from(allQuestionsMap.keys()).forEach(uniqueId => {
            const variants = allQuestionsMap.get(uniqueId);
            const langSet = new Set(variants.map(v => v.language || 'English'));
            map.set(uniqueId, langSet);
        });
        return map;
    }, [allQuestionsMap]);

    // Helper to add questions with automatic cloud backup
    const addQuestionsToState = useCallback(async (newItems, isHistory = false) => {
        // Auto-save to Firestore for crash protection
        if (newItems && newItems.length > 0) {
            console.log(`💾 Auto-saving ${newItems.length} questions to Firestore...`);
            const savePromises = newItems.map(q =>
                saveQuestionToFirestore(q).catch(err => {
                    console.warn(`⚠️ Failed to auto-save question ${q.uniqueId}:`, err);
                })
            );
            await Promise.all(savePromises);
            console.log(`✓ Auto-saved ${newItems.length} questions to cloud`);
        }

        const targetSet = isHistory ? setHistoricalQuestions : setQuestions;
        targetSet(prev => {
            const otherList = isHistory ? questions : historicalQuestions;
            const uniqueNew = filterDuplicateQuestions(newItems, prev, otherList);
            return [...prev, ...uniqueNew];
        });
    }, [questions, historicalQuestions]);

    // Helper to update question
    const updateQuestionInState = useCallback((id, updateFn) => {
        let foundInQuestions = false;
        setQuestions(prev => {
            const idx = prev.findIndex(q => q.id === id);
            if (idx === -1) return prev;
            foundInQuestions = true;
            const newArr = [...prev];
            newArr[idx] = updateFn(newArr[idx]);
            return newArr;
        });

        if (!foundInQuestions) {
            setHistoricalQuestions(prev => {
                const idx = prev.findIndex(q => q.id === id);
                if (idx === -1) return prev;
                const newArr = [...prev];
                newArr[idx] = updateFn(newArr[idx]);
                return newArr;
            });
        }
    }, []);

    // Status update handler - now accepts optional rejection reason
    const handleUpdateStatus = useCallback((id, newStatus, rejectionReason = null) => {
        updateQuestionInState(id, (q) => {
            const updatedQ = {
                ...q,
                status: newStatus,
                critique: newStatus === 'accepted' ? null : q.critique,
                // Store rejection reason if provided
                rejectionReason: newStatus === 'rejected' ? rejectionReason : null,
                rejectedAt: newStatus === 'rejected' ? new Date().toISOString() : null
            };

            // Sync to Firestore
            saveQuestionToFirestore(updatedQ).catch(err => console.error("Firestore sync failed:", err));

            return updatedQ;
        });
    }, [updateQuestionInState]);

    // Statistics - count both pending and accepted questions for generation target
    const approvedCounts = useMemo(() => {
        const counts = CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        const countedIds = new Set();

        Array.from(allQuestionsMap.values()).forEach(variants => {
            const baseQ = variants.find(v => (v.language || 'English') === 'English') || variants[0];

            // Count both pending and accepted questions for generation targets
            // This ensures newly generated questions update the counter immediately
            const isCountable = baseQ &&
                (baseQ.status === 'accepted' || baseQ.status === 'pending' || !baseQ.status) &&
                !countedIds.has(baseQ.uniqueId) &&
                baseQ.discipline === config.discipline;

            if (isCountable) {
                const typeAbbrev = baseQ.type === 'True/False' ? 'T/F' : 'MC';
                const key = `${baseQ.difficulty} ${typeAbbrev}`;
                if (Object.prototype.hasOwnProperty.call(counts, key)) {
                    counts[key]++;
                    countedIds.add(baseQ.uniqueId);
                }
            }
        });
        return counts;
    }, [allQuestionsMap, config.discipline]);

    const allItems = useMemo(() => [...questions, ...historicalQuestions], [questions, historicalQuestions]);

    const approvedCount = useMemo(() => allItems.filter(q => q.status === 'accepted').length, [allItems]);
    const rejectedCount = useMemo(() => allItems.filter(q => q.status === 'rejected').length, [allItems]);
    const pendingCount = useMemo(() => allItems.filter(q => !q.status || q.status === 'pending').length, [allItems]);

    const totalApproved = useMemo(() => {
        return CATEGORY_KEYS.reduce((sum, key) => sum + approvedCounts[key], 0);
    }, [approvedCounts]);

    const overallPercentage = useMemo(() => {
        return Math.min(100, (totalApproved / TARGET_TOTAL) * 100);
    }, [totalApproved]);

    const isTargetMet = useMemo(() => {
        if (config.difficulty === 'Balanced All') return false;
        const currentCount = approvedCounts[config.difficulty];
        return currentCount >= TARGET_PER_CATEGORY;
    }, [config.difficulty, approvedCounts]);

    const maxBatchSize = useMemo(() => {
        if (config.difficulty === 'Balanced All') {
            const maxRemaining = Math.max(...CATEGORY_KEYS.map(key => TARGET_PER_CATEGORY - approvedCounts[key]));
            if (maxRemaining <= 0) return 0;
            return Math.min(30, Math.floor(TARGET_TOTAL / 6) * 6);
        } else {
            const remaining = TARGET_PER_CATEGORY - approvedCounts[config.difficulty];
            return Math.min(33, Math.max(0, remaining));
        }
    }, [config.difficulty, approvedCounts]);

    // Delete Handlers
    const handleDelete = (id) => setDeleteConfirmId(id);

    const confirmDelete = (reason = 'Unknown') => {
        if (deleteConfirmId) {
            // Find the question before deleting to log it
            const questionToDelete = allQuestionsMap.get(deleteConfirmId)?.[0] ||
                questions.find(q => q.id === deleteConfirmId) ||
                historicalQuestions.find(q => q.id === deleteConfirmId);

            if (questionToDelete) {
                logQuestion({
                    ...questionToDelete,
                    status: 'deleted',
                    deletionReason: reason,
                    deletedAt: new Date().toISOString()
                });
            }

            console.log(`Deleting question ${deleteConfirmId}. Reason: ${reason}`);
            setQuestions(prev => prev.filter(q => q.id !== deleteConfirmId));
            setHistoricalQuestions(prev => prev.filter(q => q.id !== deleteConfirmId));
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
    const loadMoreQuestions = useCallback(async (userId) => {
        if (!hasMore || isLoadingMore) return;
        
        setIsLoadingMore(true);
        try {
            const { questions: moreQuestions, lastDoc: newLastDoc, hasMore: moreAvailable } = 
                await getQuestionsPaginated(userId, 20, lastDoc);
            
            setDatabaseQuestions(prev => [...prev, ...moreQuestions]);
            setLastDoc(newLastDoc);
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Failed to load more questions:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasMore, isLoadingMore, lastDoc]);


    return {
        questions, setQuestions,
        historicalQuestions, setHistoricalQuestions,
        databaseQuestions, setDatabaseQuestions,
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
        deleteConfirmId, setDeleteConfirmId,
        showClearModal, setShowClearModal,
        handleDelete,
        confirmDelete,
        handleDeleteAllQuestions,
        checkAndStoreQuestions
    };
};
