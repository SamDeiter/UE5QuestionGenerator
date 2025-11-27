// ============================================================================
// IMPORTS
// ============================================================================

// React core hooks
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// UI Components
import LandingPage from './components/LandingPage';
import Header from './components/Header';
import QuestionItem from './components/QuestionItem';
import NameEntryModal from './components/NameEntryModal';
import ClearConfirmationModal from './components/ClearConfirmationModal';
import BlockingProcessModal from './components/BlockingProcessModal';
import FilterButton from './components/FilterButton';
import GranularProgress from './components/GranularProgress';
import Icon from './components/Icon';
import InfoTooltip from './components/InfoTooltip';
import BulkExportModal from './components/BulkExportModal';

// Services - External integrations
import { generateContent } from './services/gemini';
import { fetchQuestionsFromSheets, saveQuestionsToSheets } from './services/googleSheets';
import { constructSystemPrompt } from './services/promptBuilder';

// Utilities - Helper functions
import { safe, formatDate, parseQuestions, downloadFile, filterDuplicateQuestions, sanitizeText, formatUrl, stripHtmlTags } from './utils/helpers';
import { processUploadedFile } from './utils/fileProcessor';
import { getCSVContent, segmentQuestions } from './utils/exportUtils';
import { CATEGORY_KEYS, TARGET_PER_CATEGORY, TARGET_TOTAL, FIELD_DELIMITER, LANGUAGE_FLAGS, LANGUAGE_CODES } from './utils/constants';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './utils/questionFilters';

const App = () => {
    // ========================================================================
    // STATE - Application Mode & UI Controls
    // ========================================================================

    // Application mode: 'landing' (home screen), 'create' (generation mode), 'review' (review mode), 'database' (view all)
    const [appMode, setAppMode] = useState('landing');

    // Cloud connectivity status (used for displaying connection state in UI)
    const [isCloudReady, setIsCloudReady] = useState(false);

    // Modal visibility controls
    const [showClearModal, setShowClearModal] = useState(false); // Confirmation dialog for clearing all questions
    const [showBulkExportModal, setShowBulkExportModal] = useState(false); // Bulk export options modal
    const [showExportMenu, setShowExportMenu] = useState(false); // Export menu visibility
    const [showSettings, setShowSettings] = useState(false); // Settings modal visibility
    const [showApiKey, setShowApiKey] = useState(false); // Toggle API key visibility in settings

    // Translation progress (0-100) for bulk translation operations
    const [translationProgress, setTranslationProgress] = useState(0);

    // Filter toggle: when true, only shows questions created by the current user
    const [filterByCreator, setFilterByCreator] = useState(false);

    // ========================================================================
    // ENVIRONMENT & API CONFIGURATION
    // ========================================================================

    // Check if running in internal Canvas environment (has auto-injected API key)
    const isInternalEnvironment = typeof window.__app_id !== 'undefined';

    // Authentication status - always ready for local/Sheets operations
    const isAuthReady = true;

    // Main application configuration (persisted to localStorage)
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ue5_gen_config');
        const defaults = {
            discipline: 'Technical Art',
            batchSize: '6',
            difficulty: 'Easy MC',
            language: 'English',
            creatorName: '',
            reviewerName: '',
            apiKey: '',
            sheetUrl: 'https://script.google.com/a/macros/epicgames.com/s/AKfycbxssaKhw3pOWkC9sPJE_6oMZuG66JYCgeEQFEHh010Q90wlHqH64oiVhFjE1JQkSTV6/exec'
        };

        const constInitialConfig = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;

        // Ensure all required fields have default values
        constInitialConfig.creatorName = constInitialConfig.creatorName || '';
        constInitialConfig.reviewerName = constInitialConfig.reviewerName || '';
        constInitialConfig.apiKey = constInitialConfig.apiKey || '';
        constInitialConfig.sheetUrl = constInitialConfig.sheetUrl || defaults.sheetUrl;

        // Reset deprecated difficulty setting
        if (constInitialConfig.difficulty === 'Balanced All') {
            constInitialConfig.difficulty = 'Easy MC';
        }

        return constInitialConfig;
    });

    // API key status computed values
    const isApiReady = isInternalEnvironment || (config.apiKey && config.apiKey.length > 5);
    const effectiveApiKey = isInternalEnvironment ? "" : config.apiKey;
    const apiKeyStatus = isInternalEnvironment ? "Auto-Injected" : (isApiReady ? "Loaded" : "Not Set");

    // ========================================================================
    // STATE - Question Data Management
    // ========================================================================

    // Central question storage: Map of uniqueId -> array of question variants (different languages)
    // This allows efficient lookup and management of multi-language questions
    const [allQuestionsMap, setAllQuestionsMap] = useState(new Map());

    // Current session questions (active generation session, persisted to localStorage)
    const [questions, setQuestions] = useState(() => {
        const saved = localStorage.getItem('ue5_gen_questions');
        return saved ? JSON.parse(saved) : [];
    });

    // Historical questions from previous sessions (loaded separately)
    const [historicalQuestions, setHistoricalQuestions] = useState([]);

    // Database view: questions loaded from Google Sheets
    const [databaseQuestions, setDatabaseQuestions] = useState([]);

    // ========================================================================
    // STATE - File Upload & Processing
    // ========================================================================

    // Uploaded reference files (CSV, text, etc.) for context-aware generation
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    // ========================================================================
    // STATE - UI & Loading States
    // ========================================================================

    // Status message displayed to user (e.g., "Generating...", "Saved")
    const [status, setStatus] = useState('');

    // Loading states for async operations
    const [isGenerating, setIsGenerating] = useState(false); // AI question generation in progress
    const [isDetecting, setIsDetecting] = useState(false); // Topic detection in progress
    const [isProcessing, setIsProcessing] = useState(false); // Generic blocking operation

    // Modal visibility
    const [showNameModal, setShowNameModal] = useState(false); // Creator name entry prompt
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); // ID of question pending deletion

    // ========================================================================
    // STATE - Filtering & Search
    // ========================================================================

    // Search term for filtering questions by text content
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ue5_pref_search') || '');

    // Filter mode: 'pending', 'accepted', 'rejected', or 'all'
    const [filterMode, setFilterMode] = useState(() => localStorage.getItem('ue5_pref_filter') || 'pending');

    // Toggle between current session and all-time view
    const [showHistory, setShowHistory] = useState(() => localStorage.getItem('ue5_pref_history') === 'true');

    // Persist preferences
    useEffect(() => {
        localStorage.setItem('ue5_pref_search', searchTerm);
        localStorage.setItem('ue5_pref_filter', filterMode);
        localStorage.setItem('ue5_pref_history', showHistory);
    }, [searchTerm, filterMode, showHistory]);

    // Review mode: current question index for card-by-card review
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

    // Toggle for advanced configuration in Create sidebar
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

    // Inline validation state for API Key
    const [showApiError, setShowApiError] = useState(false);



    // Recompute allQuestionsMap whenever session or historical questions change
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

    // Recompute the translation map (set of available languages per question ID)
    const translationMap = useMemo(() => {
        const map = new Map();
        Array.from(allQuestionsMap.keys()).forEach(uniqueId => {
            const variants = allQuestionsMap.get(uniqueId);
            const langSet = new Set(variants.map(v => v.language || 'English'));
            map.set(uniqueId, langSet);
        });
        console.log(`[Translation Map] Updated with ${map.size} unique questions`);
        if (map.size > 0) {
            const sample = Array.from(map.entries()).slice(0, 3);
            console.log(`[Translation Map] Sample:`, sample.map(([id, langs]) => ({
                id: id.substring(0, 8) + '...',
                languages: Array.from(langs),
                count: langs.size
            })));
        }
        return map;
    }, [allQuestionsMap]);


    const showMessage = useCallback((msg, duration = 3000) => {
        setStatus(msg);
        setTimeout(() => setStatus(''), duration);
    }, []);

    // Helper to safely add new questions without creating duplicates in React state
    const addQuestionsToState = (newItems, isHistory = false) => {
        const targetSet = isHistory ? setHistoricalQuestions : setQuestions;

        targetSet(prev => {
            const otherList = isHistory ? questions : historicalQuestions;
            const uniqueNew = filterDuplicateQuestions(newItems, prev, otherList);
            return [...prev, ...uniqueNew];
        });
    };

    const approvedCounts = useMemo(() => {
        const counts = CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        const countedIds = new Set();

        Array.from(allQuestionsMap.values()).forEach(variants => {
            const baseQ = variants.find(v => (v.language || 'English') === 'English') || variants[0];

            // Only count questions that match the current discipline
            if (baseQ && baseQ.status === 'accepted' && !countedIds.has(baseQ.uniqueId) && baseQ.discipline === config.discipline) {
                const typeAbbrev = baseQ.type === 'True/False' ? 'T/F' : 'MC';
                const key = `${baseQ.difficulty} ${typeAbbrev}`;
                if (counts.hasOwnProperty(key)) {
                    counts[key]++;
                    countedIds.add(baseQ.uniqueId);
                }
            }
        });
        return counts;
    }, [allQuestionsMap, config.discipline]);

    const approvedCount = questions.filter(q => q.status !== 'rejected').length;
    const rejectedCount = questions.filter(q => q.status === 'rejected').length;
    const pendingCount = questions.length - approvedCount - rejectedCount;

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

    // ========================================================================
    // EFFECTS - Auto-adjust batch size and persistence
    // ========================================================================

    // Auto-adjust batch size based on remaining quota for selected difficulty/type
    useEffect(() => {
        if (maxBatchSize > 0 && config.difficulty !== 'Balanced All') {
            // For specific categories, recommend half of remaining quota (max 10)
            const recommendedSize = Math.max(1, Math.min(10, Math.floor(maxBatchSize / 2)));
            setConfig(prev => ({ ...prev, batchSize: recommendedSize.toString() }));
        } else if (config.difficulty === 'Balanced All') {
            // For balanced mode, ensure batch size is between 6-12 and divisible by 6
            setConfig(prev => ({ ...prev, batchSize: Math.max(6, Math.min(12, maxBatchSize)).toString() }));
        } else if (maxBatchSize === 0 && config.difficulty !== 'Balanced All') {
            // Quota met - set batch size to 0
            setConfig(prev => ({ ...prev, batchSize: '0' }));
        }
    }, [config.difficulty, maxBatchSize]);

    // Prompt for creator name on first load if not set
    useEffect(() => { if (!config.creatorName) setShowNameModal(true); }, []);

    // Persist configuration to localStorage whenever it changes
    useEffect(() => { localStorage.setItem('ue5_gen_config', JSON.stringify(config)); }, [config]);

    // Persist current session questions to localStorage
    useEffect(() => localStorage.setItem('ue5_gen_questions', JSON.stringify(questions)), [questions]);

    // ========================================================================
    // HANDLERS - Question Management
    // ========================================================================

    /**
     * Clears all questions from local state and localStorage
     * Called when user confirms the "Clear All" action
     */
    const handleDeleteAllQuestions = async () => {
        setShowClearModal(false);
        setQuestions([]);
        setHistoricalQuestions([]);
        showMessage("Local session cleared.", 3000);
    };

    /**
     * Validates and prepares questions for storage
     * In Google Sheets mode, this doesn't auto-sync - user must explicitly export
     * @param {Array} newQuestions - Array of question objects to store
     * @returns {Array} The validated questions ready for local state
     */
    const checkAndStoreQuestions = async (newQuestions) => {
        // In Google Sheets mode, we don't automatically sync every generation to the sheet.
        // We only sync when the user explicitly exports/saves.
        // So this function mainly serves to return the questions to be added to local state.
        return newQuestions;
    };

    /**
     * Updates the active language filter
     * @param {string} lang - Language code (e.g., 'English', 'Chinese (Simplified)')
     */
    const handleLanguageSwitch = (lang) => {
        setConfig(prev => ({ ...prev, language: lang }));
    };

    /**
     * Handles form input changes for configuration settings
     * Validates batch size for Balanced All mode (must be multiple of 6)
     * @param {Event} e - Change event from input/select elements
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Validate batch size for Balanced All mode
        if (name === 'batchSize' && config.difficulty === 'Balanced All') {
            const num = parseInt(value);
            if (num % 6 !== 0) showMessage("For Balanced All mode, the batch size should be a multiple of 6 (e.g., 6, 12, 18) for an even distribution.", 3000);
        }
        setConfig(prev => ({ ...prev, [name]: value }));
        // If user changes language in dropdown, update global language filter
        if (name === 'language') {
            handleLanguageSwitch(value);
        }
        // Clear API error if user starts typing key
        if (name === 'apiKey') {
            setShowApiError(false);
        }
    };

    /**
     * Saves the creator name and closes the name entry modal
     * Sets both creator and reviewer to the same name
     * @param {string} name - The creator's name
     */
    const handleNameSave = (name) => {
        setConfig(prev => ({ ...prev, creatorName: name, reviewerName: name }));
        setShowNameModal(false);
    };

    /**
     * Handles file upload and processing
     * Supports CSV import (with auto-language detection) and text files for context
     * CSV files are parsed and imported as questions
     * Other text files are stored as reference material for AI generation
     * @param {Event} e - File input change event
     */
    /**
     * Handles file upload and processing
     * Uses processUploadedFile utility to handle validation, parsing, and security checks
     * @param {Event} e - File input change event
     */
    const handleFileChange = async (e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        let importedCount = 0;
        let referenceCount = 0;
        let errors = [];

        for (const file of newFiles) {
            const result = await processUploadedFile(file, config.creatorName);

            if (result.error) {
                errors.push(`${file.name}: ${result.error}`);
                continue;
            }

            if (result.type === 'questions') {
                addQuestionsToState(result.data, showHistory);
                importedCount += result.data.length;
                console.log(`[Import] Imported ${result.data.length} questions from ${file.name} (${result.language})`);
            } else if (result.type === 'reference') {
                setFiles(prev => [...prev, result.data]);
                referenceCount++;
            }
        }

        // Feedback to user
        if (importedCount > 0) showMessage(`Successfully imported ${importedCount} questions.`, 4000);
        if (referenceCount > 0) showMessage(`Added ${referenceCount} reference files.`, 3000);
        if (errors.length > 0) {
            console.error("File processing errors:", errors);
            showMessage(`Some files failed: ${errors.slice(0, 2).join(', ')}`, 6000);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /**
     * Removes a file from the uploaded files list
     * @param {number} index - Index of file to remove
     */
    const removeFile = (index) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

    /**
     * Constructs context string from uploaded files for AI prompt
     * Truncates large files to prevent token limit issues
     * @returns {string} Formatted file content for inclusion in AI prompt
     */
    const getFileContext = () => {
        const MAX_FILE_CONTENT_LENGTH = 10000; // Reduced to mitigate MAX_TOKENS issues
        let fileContext = "";
        if (files.length > 0) {
            fileContext = "\n\n### ATTACHED LOCAL SOURCE FILES:\n";
            files.forEach(f => {
                const content = f.content.substring(0, MAX_FILE_CONTENT_LENGTH);
                const isTruncated = f.content.length > MAX_FILE_CONTENT_LENGTH;
                fileContext += `\n--- START FILE: ${f.name} (Size: ${f.size} bytes) ---\n`;
                fileContext += content;
                if (isTruncated) fileContext += `\n[... File content truncated to ${MAX_FILE_CONTENT_LENGTH} characters for prompt size safety]`;
                fileContext += "\n--- END FILE ---\n";
            });
        }
        return fileContext;
    };

    // ========================================================================
    // HANDLERS - AI Generation & Translation
    // ========================================================================

    /**
     * Main question generation handler
     * Validates API readiness, quota limits, and creator name before generation
     * Parses AI response and adds unique questions to state
     */
    const handleGenerate = async () => {
        if (!config.creatorName) { showMessage("Please enter your Creator Name to start generating.", 5000); setShowNameModal(true); return; }
        if (!isApiReady) {
            setShowApiError(true);
            setShowAdvancedConfig(true);
            showMessage("API key is required. Please enter it below.", 5000);
            return;
        }

        if (config.difficulty !== 'Balanced All' && isTargetMet) { showMessage(`Quota met for ${config.difficulty}! Change difficulty/type or discipline to continue.`, 5000); return; }

        setIsGenerating(true); setShowHistory(false); setStatus('Drafting Scenarios...');
        const systemPrompt = constructSystemPrompt(config, getFileContext());
        const userPrompt = `Generate ${config.batchSize} scenario-based questions for ${config.discipline} in ${config.language}. Focus: ${config.difficulty}. Ensure links work for UE 5.7 or latest available.`;
        try {
            const text = await generateContent(effectiveApiKey, systemPrompt, userPrompt, setStatus);
            let newQuestions = parseQuestions(text);
            if (newQuestions.length === 0) throw new Error("Failed to parse generated questions.");
            const taggedQuestions = newQuestions.map(q => ({ ...q, language: config.language }));
            const uniqueNewQuestions = await checkAndStoreQuestions(taggedQuestions);

            addQuestionsToState(uniqueNewQuestions, false);

            setStatus('');
        } catch (err) { console.error(err); setStatus('Error'); showMessage(`Generation Error: ${err.message}. Please try again.`, 10000); } finally { setIsGenerating(false); }
    };

    /**
     * Uses AI to detect technical disciplines from uploaded files
     * Auto-sets the discipline dropdown to the most prominent topic
     */
    const handleDetectTopics = async () => {
        if (files.length === 0) return;
        if (!isApiReady) { showMessage("API key is required for detection. Please enter it in the settings panel.", 5000); return; }

        setIsDetecting(true); setStatus('Scanning...');
        const prompt = `Analyze content. Identify 3 prominent technical disciplines. Return ONLY comma-separated list. ${getFileContext()}`;
        try {
            const detected = await generateContent(effectiveApiKey, "Technical Analyst", prompt, setStatus);
            setConfig(prev => ({ ...prev, discipline: detected.split(',')[0].trim() }));
            setStatus('Detected'); setTimeout(() => setStatus(''), 2000);
        } catch (err) { setStatus('Failed'); } finally { setIsDetecting(false); }
    };

    // Keyboard Shortcut: Ctrl+Enter to Generate
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (appMode === 'create' && !isGenerating && !isTargetMet && isApiReady && maxBatchSize > 0) {
                    e.preventDefault();
                    handleGenerate();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, isGenerating, isTargetMet, isApiReady, maxBatchSize, handleGenerate]);

    /**
     * Translates a single question to target language
     * Preserves uniqueId to maintain question variant linking
     * @param {Object} q - Question object to translate
     * @param {string} targetLang - Target language (e.g., 'Chinese (Simplified)')
     */
    const handleTranslateSingle = async (q, targetLang) => {
        if (!isApiReady) { showMessage("API key is required for translation. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true);
        setStatus(`Translating question to ${targetLang}...`);

        const rawTable = `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| 1 | ${q.discipline} | ${q.type} | ${q.difficulty} | ${q.question} | | ${q.options.A} | ${q.options.B} | ${q.options.C || ''} | ${q.options.D || ''} | ${q.correct} | ${q.sourceUrl} | ${q.sourceExcerpt} |`;

        const prompt = `Translate this single row from ${q.language || 'English'} to ${targetLang}. Keep format EXACT. \n${rawTable}`;

        try {
            const text = await generateContent(effectiveApiKey, "Translator", prompt, setStatus);
            const translatedQs = parseQuestions(text);
            if (translatedQs.length > 0) {
                const tq = translatedQs[0];
                const newQuestion = {
                    ...tq,
                    id: Date.now(),
                    uniqueId: q.uniqueId,
                    discipline: q.discipline,
                    type: q.type,
                    difficulty: q.difficulty,
                    language: targetLang,
                    status: 'accepted',
                    dateAdded: new Date().toISOString()
                };

                await checkAndStoreQuestions([newQuestion]);
                addQuestionsToState([newQuestion], showHistory);

                handleLanguageSwitch(targetLang);

                showMessage(`Translated to ${targetLang} and saved.`, 3000);
            }
        } catch (e) {
            console.error(e);
            setStatus('Translation Failed');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Generates AI explanation for why an answer is correct
     * @param {Object} q - Question object
     */
    const handleExplain = async (q) => {
        if (!isApiReady) { showMessage("API key is required for explanation. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true); setStatus('Explaining...');
        const prompt = `Explain WHY the answer is correct in simple terms: "${q.question}" Answer: "${q.correct === 'A' ? q.options.A : q.options.B}"`;
        try {
            const exp = await generateContent(effectiveApiKey, "Technical Assistant", prompt, setStatus);
            updateQuestionInState(q.id, (item) => ({ ...item, explanation: exp }));
            setStatus('');
        } catch (e) { setStatus('Fail'); } finally { setIsProcessing(false); }
    };

    /**
     * Generates variations of an existing question
     * Creates new unique questions based on the original concept
     * @param {Object} q - Source question to create variations from
     */
    const handleVariate = async (q) => {
        if (!isApiReady) { showMessage("API key is required for creation. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true); setStatus('Creating variations...');
        const sys = constructSystemPrompt(config, getFileContext());
        const prompt = `Generate 2 NEW unique questions based on: "${q.question}". Output in Markdown Table.`;
        try {
            const text = await generateContent(effectiveApiKey, sys, prompt, setStatus);
            const newQs = parseQuestions(text);
            if (newQs.length > 0) {
                const uniqueNewQuestions = await checkAndStoreQuestions(newQs);
                addQuestionsToState(uniqueNewQuestions, showHistory);

                if (showHistory) showMessage(`Added ${uniqueNewQuestions.length} variations to Session view.`, 4000);
                else showMessage(`Added ${uniqueNewQuestions.length} new variations.`, 3000);
            }
        } catch (e) { setStatus('Fail'); } finally { setIsProcessing(false); }
    };

    /**
     * Generates AI critique for rejected questions
     * Provides actionable suggestions for improvement
     * @param {Object} q - Question object to critique
     */
    const handleCritique = async (q) => {
        if (!isApiReady) { showMessage("API key is required for critique. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true); setStatus('Critiquing...');
        const questionDetails = `Question: ${q.question}\nDiscipline: ${q.discipline}\nDifficulty: ${q.difficulty}\nCorrect Answer: ${q.correct}: ${q.options[q.correct] || 'N/A'}`;
        const systemPrompt = `You are a Technical Writing Editor specialized in Unreal Engine 5 content. Analyze this REJECTED quiz question and provide actionable, numbered suggestions for improvement. Focus on: Clarity and technical accuracy. Output ONLY a brief, numbered list of 3-5 concrete suggestions.`;
        try {
            const critiqueText = await generateContent(effectiveApiKey, systemPrompt, `Critique and suggest fixes for the following rejected question:\n${questionDetails}`, setStatus);
            updateQuestionInState(q.id, (item) => ({ ...item, critique: critiqueText }));
            showMessage('Critique Ready', 3000);
        } catch (e) { setStatus('Fail'); } finally { setIsProcessing(false); }
    };

    // ========================================================================
    // HANDLERS - Export Functions
    // ========================================================================

    /**
     * Exports questions segmented by Language, Discipline, Difficulty, and Type
     * Creates separate CSV files for each unique combination
     * Useful for organizing large question banks
     */
    const handleExportByGroup = () => {
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;
        const valid = sourceList.filter(q => q.status !== 'rejected');

        if (valid.length === 0) { setStatus("No accepted questions to export."); setTimeout(() => setStatus(''), 3000); return; }

        // NEW GROUPING: Language, Discipline, Difficulty, Type
        const groupedData = segmentQuestions(valid);

        let filesGenerated = 0;
        const exportDate = new Date();
        const datePart = formatDate(exportDate).replace(/-/g, '');

        Object.keys(groupedData).forEach(groupKey => {
            const groupQuestions = groupedData[groupKey];
            const csvContent = getCSVContent(groupQuestions, config.creatorName, config.reviewerName);

            // Format filename: Language_Discipline_Difficulty_Type_Date.csv
            const fileNameParts = groupKey.replace(/ & /g, '_').replace(/ /g, '_');
            const filename = `${fileNameParts}_${datePart}.csv`;

            downloadFile(csvContent, filename);
            filesGenerated++;
        });

        setStatus(`Exported ${filesGenerated} segmented files.`);
        setTimeout(() => setStatus(''), 5000);
        setShowExportMenu(false);
    };

    /**
     * Exports only questions matching current filter settings
     * Filters by language, discipline, difficulty, and type
     */
    const handleExportCurrentTarget = () => {
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;

        const targetString = config.difficulty; // e.g., "Easy MC"

        const [targetDiff, targetTypeAbbrev] = targetString.split(' ');
        const targetType = targetTypeAbbrev === 'MC' ? 'Multiple Choice' : 'True/False';

        // Filter by current language, discipline, difficulty, and type
        const valid = sourceList.filter(q =>
            q.status !== 'rejected' &&
            (q.language || 'English') === config.language && // Include language filter
            q.discipline === config.discipline &&
            q.difficulty === targetDiff &&
            q.type === targetType
        );

        if (valid.length === 0) {
            setStatus(`No accepted questions found for target: ${config.language} - ${targetString}`);
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        const typePart = targetString.replace(/\s/g, '_');
        const disciplinePart = config.discipline.replace(/\s/g, '_');
        const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const langPart = (config.language || 'English').replace(/ /g, '_');

        const csvContent = getCSVContent(valid, config.creatorName, config.reviewerName);
        const filename = `${langPart}_${disciplinePart}_${typePart}_${datePart}.csv`;
        downloadFile(csvContent, filename);
        setStatus(`Exported ${valid.length} questions for target ${targetString}`);
        setTimeout(() => setStatus(''), 5000);
        setShowExportMenu(false);
    };

    /**
     * Exports questions to Google Sheets via Apps Script Web App
     * Opens new tab for user to verify success
     */
    const handleExportToSheets = async () => {
        if (!config.sheetUrl) { showMessage("Please enter a Google Apps Script URL in settings.", 5000); return; }

        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;
        const validQuestions = sourceList.filter(q => q.status !== 'rejected');

        if (validQuestions.length === 0) {
            showMessage("No accepted questions to export.", 3000);
            return;
        }

        setIsProcessing(true);
        setStatus("Sending data to Google Sheets...");
        setShowExportMenu(false);

        try {
            await saveQuestionsToSheets(config.sheetUrl, validQuestions);
            showMessage(`Export launched in new tab! Check it for "Success" message.`, 7000);
        } catch (e) {
            console.error("Error pushing to Sheets endpoint:", e);
            showMessage(`Error connecting to endpoint. Check URL/Console: ${e.message}`, 10000);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Loads questions from Google Sheets into Database View
     * Maps Google Sheets column names to application schema
     */
    const handleLoadFromSheets = async () => {
        if (!config.sheetUrl) { showMessage("Please enter a Google Apps Script URL first.", 3000); return; }

        setIsProcessing(true);
        setStatus("Loading from Google Sheets...");
        setShowExportMenu(false);

        try {
            const data = await fetchQuestionsFromSheets(config.sheetUrl);
            // Map Google Sheets field names to JavaScript property names
            const loadedQuestions = data.map((q, index) => ({
                id: Date.now() + index + Math.random(),
                uniqueId: q['Unique ID'] || q.uniqueId || crypto.randomUUID(),
                discipline: q.Discipline || q.discipline || 'Imported',
                difficulty: q.Difficulty || q.difficulty || 'Easy',
                type: q['Question Type'] || q.Type || q.type || 'Multiple Choice',
                question: q.Question || q.question || '',
                options: {
                    A: q['Option A'] || q.OptionA || '',
                    B: q['Option B'] || q.OptionB || '',
                    C: q['Option C'] || q.OptionC || '',
                    D: q['Option D'] || q.OptionD || ''
                },
                correct: q.Answer || q.correct || '',
                explanation: q.Explanation || q.explanation || '',
                language: q.Language || q.language || 'English',
                sourceUrl: q.SourceFile || q.sourceUrl || '',
                sourceExcerpt: q.sourceExcerpt || '',
                creatorName: q.creator || q.creatorName || '',
                reviewerName: q.reviewer || q.reviewerName || '',
                status: 'accepted'
            }));

            setDatabaseQuestions(loadedQuestions);
            setAppMode('database');
            showMessage(`Loaded ${loadedQuestions.length} questions from Database View!`, 3000);
        } catch (e) {
            console.error("Load Error:", e);
            showMessage(`Load Failed: ${e.message}. (Ensure Script Access is set to 'Anyone')`, 7000);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Bulk translates all accepted English questions to CN, JP, and KR
     * Only translates missing language variants (skips existing translations)
     * Uses uniqueId to link translations to original questions
     */
    const handleBulkTranslateMissing = async () => {
        if (isProcessing) return;
        if (!isApiReady) { showMessage("API key is required for bulk translation. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true);
        setShowHistory(false);

        const targetLangs = ['Chinese (Simplified)', 'Japanese', 'Korean'];
        const translationQueue = [];

        const baseQuestions = Array.from(allQuestionsMap.values()).map(variants =>
            variants.find(v => (v.language || 'English') === 'English') || variants[0]
        );

        baseQuestions.forEach(q => {
            const existingLangs = translationMap.get(q.uniqueId) || new Set();

            targetLangs.forEach(targetLang => {
                if (q.status === 'accepted' && !existingLangs.has(targetLang)) {
                    translationQueue.push({ question: q, targetLang });
                }
            });
        });

        if (translationQueue.length === 0) {
            showMessage("All CN, JP, and KR translations already exist for all accepted questions.", 5000);
            setIsProcessing(false);
            return;
        }

        showMessage(`Found ${translationQueue.length} missing translations. Starting bulk generation...`);
        let generatedCount = 0;
        let totalProgress = 0;
        const totalQueueSize = translationQueue.length;

        for (const { question: q, targetLang } of translationQueue) {
            const rawTable = `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| 1 | ${q.discipline} | ${q.type} | ${q.difficulty} | ${q.question} | | ${q.options.A} | ${q.options.B} | ${q.options.C || ''} | ${q.options.D || ''} | ${q.correct} | ${q.sourceUrl} | ${q.sourceExcerpt} |`;
            const prompt = `Translate this single row from ${q.language || 'English'} to ${targetLang}. Keep format EXACT. \n${rawTable}`;
            const systemPrompt = `You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided Markdown table from ${q.language || 'English'} to ${targetLang}. CRITICAL INSTRUCTIONS: 1. Preserve the exact Markdown table structure. 2. Translate ONLY: Question, OptionA, OptionB, OptionC, OptionD, and SourceExcerpt. 3. DO NOT translate: ID, Discipline, Type, Difficulty, Answer, CorrectLetter, and SourceURL.`;

            try {
                setStatus(`Translating: ${q.uniqueId.substring(0, 4)} -> ${targetLang}...`);
                const text = await generateContent(effectiveApiKey, systemPrompt, prompt, setStatus);
                const translatedQs = parseQuestions(text);

                if (translatedQs.length > 0) {
                    const tq = translatedQs[0];
                    const newQuestion = {
                        ...tq,
                        id: Date.now() + Math.random(),
                        uniqueId: q.uniqueId,
                        discipline: q.discipline,
                        type: q.type,
                        difficulty: q.difficulty,
                        language: targetLang,
                        status: 'accepted',
                        dateAdded: new Date().toISOString()
                    };

                    await checkAndStoreQuestions([newQuestion]);
                    addQuestionsToState([newQuestion], showHistory);
                    generatedCount++;
                }
            } catch (e) {
                console.error(`Failed to generate translation for ${q.uniqueId} to ${targetLang}:`, e);
            }

            totalProgress = Math.floor((generatedCount / totalQueueSize) * 100);
            setTranslationProgress(totalProgress);
        }

        showMessage(`Bulk translation complete! Generated ${generatedCount} new translations.`, 7000);
        setIsProcessing(false);
    };

    /**
     * Updates a question in state (searches both current and historical)
     * @param {number|string} id - Question ID to update
     * @param {Function} updateFn - Function that receives current question and returns updated version
     */
    const updateQuestionInState = (id, updateFn) => {
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
    };

    /**
     * Updates question status (accepted/rejected/pending)
     * Clears critique when accepting a previously rejected question
     * @param {number|string} id - Question ID
     * @param {string} newStatus - New status value
     */
    const handleUpdateStatus = (id, newStatus) => {
        updateQuestionInState(id, (q) => ({
            ...q,
            status: newStatus,
            critique: newStatus === 'accepted' ? null : q.critique
        }));
    };

    /**
     * Initiates the delete process by showing a confirmation modal
     * @param {number|string} id - Question ID to delete
     */
    const handleDelete = (id) => {
        setDeleteConfirmId(id);
    };

    /**
     * Executes the actual deletion after user confirmation
     */
    const confirmDelete = () => {
        if (deleteConfirmId) {
            setQuestions(prev => prev.filter(q => q.id !== deleteConfirmId));
            setHistoricalQuestions(prev => prev.filter(q => q.id !== deleteConfirmId));
            showMessage('Question deleted permanently.', 2000);
            setDeleteConfirmId(null);
        }
    };

    /**
     * Handles category selection from the progress panel
     * @param {string} categoryKey - Category key (e.g., 'Easy MC', 'Hard T/F')
     */
    const handleSelectCategory = (categoryKey) => {
        setConfig(prev => ({ ...prev, difficulty: categoryKey }));
    };

    // ========================================================================
    // COMPUTED VALUES - Question Filtering
    // ========================================================================

    // Primary filter: Apply status, creator, search, discipline, difficulty, type filters
    const filteredQuestions = useMemo(() => createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory,
        filterMode,
        filterByCreator,
        searchTerm,
        config.creatorName,
        config.discipline,
        config.difficulty,
        config.language
    ), [questions, historicalQuestions, showHistory, filterMode, filterByCreator, searchTerm, config.creatorName, config.discipline, config.difficulty, config.language]);

    // Secondary filter: Deduplicate by uniqueId and select preferred language variant
    // For each uniqueId, prioritizes the currently selected language
    const uniqueFilteredQuestions = useMemo(() => createUniqueFilteredQuestions(
        filteredQuestions,
        config.language
    ), [filteredQuestions, config.language]);


    // Reset review index when entering review mode or when filters change
    useEffect(() => {
        setCurrentReviewIndex(0);
    }, [appMode, config.discipline, config.difficulty, config.language, filterMode, searchTerm]);

    // Keyboard navigation for Review Mode
    useEffect(() => {
        if (appMode !== 'review') return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestions.length - 1));
            } else if (e.key === 'ArrowLeft') {
                setCurrentReviewIndex(prev => Math.max(prev - 1, 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, uniqueFilteredQuestions.length]);



    const totalApproved = useMemo(() => {
        return CATEGORY_KEYS.reduce((sum, key) => sum + approvedCounts[key], 0);
    }, [approvedCounts]);

    const overallPercentage = useMemo(() => {
        return Math.min(100, (totalApproved / TARGET_TOTAL) * 100);
    }, [totalApproved]);

    const [showProgressMenu, setShowProgressMenu] = useState(false);

    /**
     * Handles app mode selection from landing page
     * Configures appropriate filter settings for each mode
     * @param {string} mode - App mode ('create', 'review', 'database')
     */
    const handleModeSelect = (mode) => {
        setAppMode(mode);
        setShowExportMenu(false);
        setShowProgressMenu(false);
        if (mode === 'review') {
            setShowHistory(true);
            setFilterMode('all');
        } else {
            setShowHistory(false);
            setFilterMode('pending');
        }
    };

    /**
     * Switches to database view and auto-loads from Google Sheets
     * Requires Google Sheets URL to be configured
     */
    const handleViewDatabase = async () => {
        // Always auto-load fresh data from Google Sheets when entering database view
        if (!config.sheetUrl) {
            showMessage("Please configure Google Sheets URL in settings first.", 5000);
            return;
        }

        // Set mode first to show the database view with loading state
        setAppMode('database');

        // Then load the data
        await handleLoadFromSheets();
    };

    /**
     * Advanced bulk export with multiple format and filtering options
     * Supports CSV, JSON, Markdown, and Google Sheets
     * Can segment files by language/discipline/difficulty/type
     * @param {Object} exportOptions - Export configuration object
     */
    const handleBulkExport = async (exportOptions) => {
        const { format, includeRejected, languages, scope, segmentFiles, limit } = exportOptions;

        // 1. Determine Source Questions
        let sourceQuestions = [];
        if (scope === 'filtered') {
            // Get IDs of currently visible questions
            const visibleIds = new Set(uniqueFilteredQuestions.map(q => q.uniqueId));
            // Get all variants for these IDs
            sourceQuestions = Array.from(allQuestionsMap.values())
                .flatMap(variants => variants.filter(v => visibleIds.has(v.uniqueId)));
        } else {
            // All questions
            sourceQuestions = Array.from(allQuestionsMap.values()).flat();
        }

        // 2. Filter by Language and Status
        let questionsToExport = sourceQuestions.filter(q => {
            const langMatch = languages.includes(q.language || 'English');
            const statusMatch = includeRejected || q.status !== 'rejected';
            return langMatch && statusMatch;
        });

        // 2.5 Apply Limit if set
        if (limit && limit > 0) {
            questionsToExport = questionsToExport.slice(0, limit);
        }

        if (questionsToExport.length === 0) {
            showMessage('No questions to export with selected options.', 3000);
            return;
        }

        // 3. Handle Google Sheets
        if (format === 'sheets') {
            if (!config.sheetUrl) { showMessage("Please enter a Google Apps Script URL in settings.", 5000); return; }
            setIsProcessing(true);
            setStatus("Sending data to Google Sheets...");
            try {
                await saveQuestionsToSheets(config.sheetUrl, questionsToExport);
                showMessage(`Export launched! Check new tab for status.`, 5000);
            } catch (e) {
                console.error(e);
                showMessage(`Error: ${e.message}`, 5000);
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // 4. Handle Segmentation (CSV only)
        if (segmentFiles && format === 'csv') {
            const groupedData = questionsToExport.reduce((acc, q) => {
                const typeAbbrev = q.type === 'True/False' ? 'T/F' : 'MC';
                const key = `${q.language || 'English'}_${q.discipline}_${q.difficulty}_${typeAbbrev}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(q);
                return acc;
            }, {});

            let filesGenerated = 0;
            const datePart = formatDate(new Date()).replace(/-/g, '');

            Object.keys(groupedData).forEach(groupKey => {
                const groupQuestions = groupedData[groupKey];
                const csvContent = getCSVContent(groupQuestions, config.creatorName, config.reviewerName);
                const fileNameParts = groupKey.replace(/ & /g, '_').replace(/ /g, '_');
                const filename = `${fileNameParts}_${datePart}.csv`;
                downloadFile(csvContent, filename);
                filesGenerated++;
            });
            showMessage(`Exported ${filesGenerated} segmented files.`, 4000);
            return;
        }

        // 5. Standard Export (Single File)
        if (format === 'csv') {
            const csvContent = getCSVContent(questionsToExport, config.creatorName, config.reviewerName);
            downloadFile(csvContent, `bulk_export_${Date.now()}.csv`, 'text/csv');
        } else if (format === 'json') {
            downloadFile(JSON.stringify(questionsToExport, null, 2), `bulk_export_${Date.now()}.json`, 'application/json');
        } else if (format === 'markdown') {
            const md = questionsToExport.map(q => {
                return `## ${q.question}\n\n**Difficulty:** ${q.difficulty} | **Type:** ${q.type} | **Language:** ${q.language}\n\n**Options:**\n- A: ${q.options?.A}\n- B: ${q.options?.B}\n${q.options?.C ? `- C: ${q.options.C}\n` : ''}${q.options?.D ? `- D: ${q.options.D}\n` : ''}\n**Correct:** ${q.correct}\n\n---\n`;
            }).join('\n');
            downloadFile(md, `bulk_export_${Date.now()}.md`, 'text/markdown');
        }

        showMessage(`Exported ${questionsToExport.length} questions as ${format.toUpperCase()}.`, 4000);
    };

    // Global Keyboard Shortcuts (Ctrl+S, Ctrl+E)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ctrl+S: Save/Export
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (config.sheetUrl) {
                    handleExportToSheets();
                } else {
                    // Default quick export: CSV, current language, all questions
                    handleBulkExport({
                        format: 'csv',
                        includeRejected: false,
                        languages: [config.language],
                        scope: 'all'
                    });
                }
            }
            // Ctrl+E: Open Export Modal
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setShowBulkExportModal(true);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [config.sheetUrl, config.language, handleExportToSheets, handleBulkExport]);

    const handleGoHome = () => {
        setAppMode('landing');
    };



    if (appMode === 'landing') {
        return <LandingPage onSelectMode={handleModeSelect} apiKeyStatus={apiKeyStatus} isCloudReady={isCloudReady} />;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
            <Header apiKeyStatus={apiKeyStatus} isCloudReady={isCloudReady} onHome={handleGoHome} creatorName={config.creatorName} appMode={appMode} />

            {config.creatorName === '' && <NameEntryModal onSave={handleNameSave} />}
            {showClearModal && <ClearConfirmationModal onConfirm={handleDeleteAllQuestions} onCancel={() => setShowClearModal(false)} />}

            {/* Single Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 space-y-4">
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2"><Icon name="trash-2" size={20} /> DELETE QUESTION?</h3>
                        <p className="text-sm text-slate-300">This action will permanently delete this question. This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && <BlockingProcessModal isProcessing={isProcessing} status={status} translationProgress={translationProgress} />}
            {showBulkExportModal && <BulkExportModal onClose={() => setShowBulkExportModal(false)} onExport={handleBulkExport} questionCount={allQuestionsMap.size} />}

            <div className="flex flex-1 overflow-hidden">
                {appMode === 'create' && (
                    <aside className="w-80 flex-shrink-0 z-10 shadow-xl border-r border-slate-700 bg-slate-950 p-6 overflow-y-auto flex flex-col gap-6">


                        {/* Discipline & Language - Moved to Top */}
                        <div className="space-y-3 mb-6">
                            <div className="space-y-1">
                                <div className="flex items-center"><label className="text-xs font-bold uppercase text-slate-400">Discipline</label><InfoTooltip text="Topic focus" /></div>
                                <select name="discipline" value={config.discipline} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500">
                                    <option value="Technical Art">Technical Art</option><option value="Animation & Rigging">Animation & Rigging</option><option value="Game Logic & Systems">Game Logic & Systems</option><option value="Look Development (Materials)">Look Development (Materials)</option><option value="Networking">Networking</option><option value="C++ Programming">C++ Programming</option><option value="VFX (Niagara)">VFX (Niagara)</option><option value="World Building & Level Design">World Building & Level Design</option><option value="Blueprints">Blueprints</option><option value="Lighting & Rendering">Lighting & Rendering</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center"><label className="text-xs font-bold uppercase text-slate-400">Language</label></div>
                                <select name="language" value={config.language} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500">
                                    <option>English</option><option>Chinese (Simplified)</option><option>Japanese</option><option>Korean</option><option>Spanish</option><option>French</option>
                                </select>
                            </div>
                        </div>

                        {/* NEW OVERALL PROGRESS BOX */}
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner space-y-3">
                            <div className="text-center">
                                <h3 className="text-xl font-extrabold text-white">{allQuestionsMap.size}</h3>
                                <p className="text-xs font-semibold uppercase text-slate-400">UNIQUE QUESTIONS IN DB</p>
                            </div>
                            <div className="border-t border-slate-800 pt-3 space-y-1">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-xs font-bold text-slate-300">APPROVED QUOTA ({totalApproved}/{TARGET_TOTAL})</h3>
                                    <span className="text-xs font-bold text-orange-400">{overallPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-700">
                                    <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${overallPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <GranularProgress approvedCounts={approvedCounts} target={TARGET_PER_CATEGORY} isTargetMet={isTargetMet} selectedDifficulty={config.difficulty} handleSelectCategory={handleSelectCategory} />



                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner">
                            <div className="flex items-center mb-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2"><Icon name="hash" size={12} /> Batch Size (Max {maxBatchSize})</label>
                                <InfoTooltip text="Number of questions to generate in one batch. Dynamically capped by remaining quota." />
                            </div>
                            <input type="number" min="1" max={maxBatchSize} name="batchSize" value={config.batchSize} onChange={handleChange} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500" placeholder="e.g. 6, 12, 18" />
                        </div>
                        {/* Sticky Action Footer */}
                        <div className="sticky bottom-0 bg-slate-950 pt-4 pb-2 border-t border-slate-800 z-20 -mx-6 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                            <div className="space-y-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || isTargetMet || maxBatchSize === 0 || !isApiReady}
                                    className={`w-full py-4 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isGenerating || isTargetMet || maxBatchSize === 0 || !isApiReady ? 'bg-slate-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'}`}
                                    title={
                                        !isApiReady ? '⚠️ API Key Required - Configure in Settings' :
                                            isTargetMet ? '✓ Quota Met for this Category' :
                                                maxBatchSize === 0 ? '✓ All Categories Complete' :
                                                    'Generate new questions'
                                    }
                                >
                                    {isGenerating ? (
                                        <><Icon name="loader" size={16} className="animate-spin" /> GENERATING...</>
                                    ) : !isApiReady ? (
                                        <><Icon name="alert-circle" size={16} /> API KEY REQUIRED</>
                                    ) : isTargetMet ? (
                                        <><Icon name="check-circle" size={16} /> QUOTA MET</>
                                    ) : (
                                        <><Icon name="book-open" size={16} /> GENERATE QUESTIONS</>
                                    )}
                                </button>

                                <button onClick={handleBulkTranslateMissing} disabled={isProcessing || isGenerating || Array.from(allQuestionsMap.keys()).length === 0 || !isApiReady} className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all border ${isProcessing || isGenerating || Array.from(allQuestionsMap.keys()).length === 0 || !isApiReady ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-950/50 text-indigo-400 hover:bg-indigo-900/50 border-indigo-700'}`}>
                                    <Icon name="languages" size={14} /> BULK TRANSLATE (CN/JP/KR)
                                </button>
                            </div>
                        </div>
                        {/* Advanced Configuration Toggle */}
                        <div className="pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                                className="w-full flex items-center justify-between text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
                            >
                                <span>Advanced Configuration</span>
                                <Icon name={showAdvancedConfig ? "chevron-up" : "chevron-down"} size={14} />
                            </button>
                        </div>

                        {/* Collapsible Advanced Section */}
                        {showAdvancedConfig && (
                            <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                                {/* Source Files */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end"><label className="text-xs font-bold uppercase text-slate-400">Source Files</label>{files.length > 0 && <button onClick={handleDetectTopics} disabled={isDetecting || !isApiReady} className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50">{isDetecting ? "..." : "Detect"}</button>}</div>
                                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-900 cursor-pointer text-center bg-slate-900/50"><Icon name="upload" className="mx-auto text-slate-600 mb-2" /><p className="text-xs text-slate-500">Upload .csv</p><input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" /></div>
                                    {files.map((f, i) => <div key={i} className="flex justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-400"><span className="truncate">{f.name}</span><button onClick={() => removeFile(i)} className="text-red-500">x</button></div>)}
                                </div>

                                {/* API Key Configuration */}
                                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner space-y-2">
                                    <div className="flex items-center">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                            <Icon name="key" size={12} /> Gemini API Key
                                        </label>
                                        <InfoTooltip text="Enter your personal Gemini API key here. Required if running outside the Canvas environment." />
                                    </div>
                                    <input
                                        type="password"
                                        name="apiKey"
                                        value={config.apiKey}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500"
                                        placeholder={isInternalEnvironment ? "Auto-Auth Enabled" : "Enter your key..."}
                                        disabled={isInternalEnvironment}
                                    />
                                    <div className={`text-xs font-mono text-right ${apiKeyStatus.includes('Loaded') || apiKeyStatus.includes('Auto') ? 'text-green-500' : 'text-red-500'}`}>
                                        {apiKeyStatus}
                                    </div>
                                    {showApiError && (
                                        <div className="text-xs text-red-500 font-bold animate-pulse mt-1 flex items-center gap-1">
                                            <Icon name="alert-circle" size={12} /> API Key is required to generate.
                                        </div>
                                    )}
                                </div>

                                {/* Google Sheets URL Configuration */}
                                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 shadow-inner space-y-2">
                                    <div className="flex items-center">
                                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                            <Icon name="table" size={12} /> Google Sheets App URL
                                        </label>
                                        <InfoTooltip text="Enter the Web App URL of your Google Apps Script deployment." />
                                    </div>
                                    <input
                                        type="text"
                                        name="sheetUrl"
                                        value={config.sheetUrl}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-orange-500"
                                        placeholder="https://script.google.com/..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={handleLoadFromSheets} disabled={!config.sheetUrl || isProcessing} className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-600 text-slate-300">Load</button>
                                        <button onClick={handleExportToSheets} disabled={!config.sheetUrl || isProcessing} className="flex-1 py-1 px-2 bg-green-900/50 hover:bg-green-800/50 text-xs rounded border border-green-700 text-green-400">Save</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded flex items-center justify-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                <Icon name="settings" size={14} /> Open Settings
                            </button>
                        </div>
                    </aside>
                )}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900 shadow-md z-10">
                        <div className="flex gap-4 items-center">
                            {isAuthReady ? (<>{status && <span className="text-xs text-orange-500 font-medium flex items-center gap-1 animate-pulse"><Icon name="loader" size={12} className="animate-spin" /> {status}</span>}{!status && <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Icon name="database" size={14} /> DB Ready</span>}</>) : (<span className="text-xs text-yellow-500 font-medium flex items-center gap-1 animate-pulse"><Icon name="plug" size={12} className="animate-pulse" /> Connecting to DB...</span>)}

                            {/* Only show filters/stats if NOT in Review Mode, or if Review Mode and data loaded */}
                            {/* Only show filters/stats if NOT in Review Mode, or if Review Mode and data loaded */}
                            {appMode === 'review' && (
                                <div className="flex gap-4 items-center ml-4">
                                    <div className="px-3 py-1 bg-indigo-900/30 border border-indigo-700/50 rounded text-xs text-indigo-300 font-bold flex items-center gap-2">
                                        <Icon name="list-checks" size={14} />
                                        REVIEW MODE: {uniqueFilteredQuestions.length} Items
                                    </div>

                                    {/* Progress Summary Popover for Review Mode */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowProgressMenu(!showProgressMenu)}
                                            className={`px-3 py-1 border rounded text-xs font-bold flex items-center gap-2 transition-colors ${showProgressMenu ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                        >
                                            <Icon name="bar-chart-2" size={14} />
                                            Progress: {overallPercentage.toFixed(1)}%
                                        </button>

                                        {showProgressMenu && (
                                            <>
                                                {/* Backdrop to close on click outside */}
                                                <div className="fixed inset-0 z-40" onClick={() => setShowProgressMenu(false)}></div>

                                                <div className="absolute left-0 top-full mt-2 w-80 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="space-y-4">
                                                        <div className="text-center pb-2 border-b border-slate-800">
                                                            <h3 className="text-lg font-extrabold text-white">{allQuestionsMap.size}</h3>
                                                            <p className="text-[10px] font-semibold uppercase text-slate-500">UNIQUE QUESTIONS IN DB</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-end">
                                                                <h3 className="text-[10px] font-bold text-slate-400">APPROVED QUOTA ({totalApproved}/{TARGET_TOTAL})</h3>
                                                                <span className="text-[10px] font-bold text-orange-400">{overallPercentage.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800">
                                                                <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${overallPercentage}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <GranularProgress approvedCounts={approvedCounts} target={TARGET_PER_CATEGORY} isTargetMet={isTargetMet} selectedDifficulty={config.difficulty} handleSelectCategory={handleSelectCategory} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 items-center bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
                            {/* LOAD BUTTON */}
                            <button
                                onClick={handleLoadFromSheets}
                                disabled={isProcessing || !config.sheetUrl}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${!config.sheetUrl ? 'opacity-50 cursor-not-allowed' : ''} bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white`}
                                title={config.sheetUrl ? "Load Approved Questions from Google Sheets" : "Configure Sheets URL in Settings first"}
                            >
                                <Icon name="table" size={14} /> Load
                            </button>



                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowBulkExportModal(true)}
                                    className="px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                                    title="Open Export Options"
                                >
                                    <Icon name="download" size={14} /> Export
                                </button>
                            </div>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            {/* DATABASE TOGGLE */}
                            <button
                                onClick={handleViewDatabase}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${appMode === 'database' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                                title="Switch to Database View"
                            >
                                <Icon name="database" size={14} /> DB View
                            </button>



                            {/* In Review Mode or History view, filter by status makes sense */}
                            {((!showHistory && questions.length > 0) || (showHistory && historicalQuestions.length > 0) || appMode === 'review') && (
                                <>
                                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                    {/* In Review Mode, usually everything is 'accepted' unless rejected in this session, but let's keep filters */}
                                    {appMode !== 'review' && <FilterButton mode="pending" current={filterMode} setFilter={setFilterMode} label="Pending" count={pendingCount} />}
                                    <FilterButton mode="all" current={filterMode} setFilter={setFilterMode} label="All" count={appMode === 'review' ? historicalQuestions.length : questions.length} />
                                    {appMode !== 'review' && <FilterButton mode="accepted" current={filterMode} setFilter={setFilterMode} label="Accepted" count={approvedCount} />}
                                    <FilterButton mode="rejected" current={filterMode} setFilter={setFilterMode} label="Rejected" count={rejectedCount} />
                                </>
                            )}

                            <div className="w-px h-4 bg-slate-700 mx-1"></div>
                            <button
                                onClick={() => setFilterByCreator(!filterByCreator)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${filterByCreator ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'}`}
                                title="Filter by My Creator Name"
                            >
                                <Icon name="user" size={12} /> My Questions
                            </button>
                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                            <input type="text" placeholder="Search by ID, Question Text, Option, or Discipline..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 bg-slate-900 text-slate-300 placeholder-slate-600 border-none outline-none focus:ring-0 text-sm px-2 rounded" />
                            {searchTerm && (<button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-red-400 p-1 rounded"><Icon name="x" size={16} /></button>)}

                            {/* In Review Mode, add Filters for Language, Discipline, and Difficulty */}
                            {appMode === 'review' && (
                                <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Lang:</label>
                                        <select name="language" value={config.language} onChange={handleChange} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500">
                                            <option>English</option><option>Chinese (Simplified)</option><option>Japanese</option><option>Korean</option><option>Spanish</option><option>French</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Disc:</label>
                                        <select name="discipline" value={config.discipline} onChange={handleChange} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500 max-w-[100px]">
                                            <option value="Technical Art">Tech Art</option><option value="Animation & Rigging">Anim</option><option value="Game Logic & Systems">Logic</option><option value="Look Development (Materials)">LookDev</option><option value="Networking">Net</option><option value="C++ Programming">C++</option><option value="VFX (Niagara)">VFX</option><option value="World Building & Level Design">World</option><option value="Blueprints">BP</option><option value="Lighting & Rendering">Light</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">Diff:</label>
                                        <select name="difficulty" value={config.difficulty} onChange={(e) => handleSelectCategory(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs outline-none focus:border-indigo-500">
                                            {CATEGORY_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-black/20 space-y-4">
                        {!showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && (<div className="flex flex-col items-center justify-center h-full text-slate-600"><Icon name="terminal" size={48} className="mb-4 text-slate-800" /><p className="font-medium text-slate-500">Ready. Click 'GENERATE QUESTIONS' to begin or upload a source file.</p></div>)}

                        {appMode === 'database' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Icon name="database" /> Database View</h2>
                                        <p className="text-xs text-blue-300/70">Viewing {databaseQuestions.length} approved questions from Google Sheets (Read Only)</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            if (window.confirm("ARE YOU SURE? This will permanently DELETE ALL questions from the Cloud Database (Master_DB). This cannot be undone.")) {
                                                clearQuestionsFromSheets(config.sheetUrl);
                                                setDatabaseQuestions([]);
                                            }
                                        }} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded border border-red-500 flex items-center gap-2 font-bold shadow-sm shadow-red-900/50">
                                            <Icon name="alert-triangle" size={12} /> HARD RESET
                                        </button>
                                        <button onClick={() => setDatabaseQuestions([])} className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-800 flex items-center gap-2">
                                            <Icon name="trash-2" size={12} /> Clear View
                                        </button>
                                        <button onClick={handleLoadFromSheets} disabled={isProcessing} className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs rounded border border-blue-600 flex items-center gap-2">
                                            <Icon name="refresh-cw" size={12} className={isProcessing ? "animate-spin" : ""} /> Refresh
                                        </button>
                                    </div>
                                </div>
                                {databaseQuestions.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">No questions loaded from database. Click Refresh.</div>
                                ) : (
                                    databaseQuestions.map((q, i) => (
                                        <div key={i} className="opacity-75 hover:opacity-100 transition-opacity">
                                            <QuestionItem
                                                q={q}
                                                // Pass dummy handlers or read-only mode if supported
                                                onUpdateStatus={() => { }}
                                                onExplain={() => { }}
                                                onVariate={() => { }}
                                                onCritique={() => { }}
                                                onTranslateSingle={() => { }}
                                                onSwitchLanguage={() => { }}
                                                onDelete={() => { }}
                                                availableLanguages={new Set()}
                                                isProcessing={false}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : appMode === 'review' && uniqueFilteredQuestions.length > 0 ? (
                            <div className="flex flex-col items-center justify-start h-full max-w-4xl mx-auto w-full pt-4">
                                <div className="w-full mb-6 flex justify-between items-center text-slate-400 text-xs font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                    <button
                                        onClick={() => setCurrentReviewIndex(prev => Math.max(prev - 1, 0))}
                                        disabled={currentReviewIndex === 0}
                                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                                    >
                                        <Icon name="arrow-left" size={16} /> PREV
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-slate-500 uppercase text-[10px] tracking-widest">Review Progress</span>
                                        <span className="text-lg">
                                            <span className="text-white font-bold">{currentReviewIndex + 1}</span> <span className="text-slate-600">/</span> <span className="text-slate-400 font-bold">{uniqueFilteredQuestions.length}</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestions.length - 1))}
                                        disabled={currentReviewIndex === uniqueFilteredQuestions.length - 1}
                                        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                                    >
                                        NEXT <Icon name="arrow-right" size={16} />
                                    </button>
                                </div>

                                <div className="w-full transform transition-all duration-300">
                                    <QuestionItem
                                        key={uniqueFilteredQuestions[currentReviewIndex].uniqueId}
                                        q={uniqueFilteredQuestions[currentReviewIndex]}
                                        onUpdateStatus={handleUpdateStatus}
                                        onExplain={handleExplain}
                                        onVariate={handleVariate}
                                        onCritique={handleCritique}
                                        onTranslateSingle={handleTranslateSingle}
                                        onSwitchLanguage={handleLanguageSwitch}
                                        onDelete={handleDelete}
                                        availableLanguages={translationMap.get(uniqueFilteredQuestions[currentReviewIndex].uniqueId)}
                                        isProcessing={isProcessing}
                                    />
                                </div>
                            </div>
                        ) : (
                            uniqueFilteredQuestions.map(q => (
                                <QuestionItem
                                    key={q.uniqueId}
                                    q={q}
                                    onUpdateStatus={handleUpdateStatus}
                                    onExplain={handleExplain}
                                    onVariate={handleVariate}
                                    onCritique={handleCritique}
                                    onTranslateSingle={handleTranslateSingle}
                                    onSwitchLanguage={handleLanguageSwitch}
                                    onDelete={handleDelete}
                                    availableLanguages={translationMap.get(q.uniqueId)}
                                    isProcessing={isProcessing}
                                />
                            ))
                        )}

                        {uniqueFilteredQuestions.length === 0 && filteredQuestions.length > 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 pt-10">
                                <Icon name="filter" size={32} className="mb-3 text-slate-800" />
                                <p className="font-medium text-slate-500">No questions match current filters.</p>
                                {filterByCreator && (
                                    <p className="text-xs text-slate-600 mt-2">
                                        Filtering by Creator: <span className="text-blue-500 font-bold">{config.creatorName}</span>.
                                        <button onClick={() => setFilterByCreator(false)} className="ml-2 underline hover:text-blue-400">Show All Creators?</button>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* NAME ENTRY MODAL */}
            {showNameModal && (
                <NameEntryModal
                    onSave={(name) => {
                        setConfig(prev => ({ ...prev, creatorName: name, reviewerName: name }));
                        setShowNameModal(false);
                    }}
                />
            )}

            {/* SETTINGS MODAL */}
            {
                showSettings && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icon name="settings" /> Settings</h2>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><Icon name="x" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Gemini API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            name="apiKey"
                                            value={config.apiKey}
                                            onChange={handleChange}
                                            placeholder="AIzaSy..."
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none pr-10"
                                        />
                                        <button
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        >
                                            <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Required for generating questions. Stored locally.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Apps Script URL</label>
                                    <input
                                        type="text"
                                        name="sheetUrl"
                                        value={config.sheetUrl}
                                        onChange={handleChange}
                                        placeholder="https://script.google.com/..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Required for Load/Export to Sheets.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Creator Name</label>
                                        <input
                                            type="text"
                                            name="creatorName"
                                            value={config.creatorName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reviewer Name</label>
                                        <input
                                            type="text"
                                            name="reviewerName"
                                            value={config.reviewerName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700 mt-4">
                                    <button
                                        onClick={() => {
                                            if (window.confirm("This will delete ALL your local questions and settings. Are you sure?")) {
                                                localStorage.removeItem('ue5_gen_config');
                                                localStorage.removeItem('ue5_gen_questions');
                                                setQuestions([]);
                                                setDatabaseQuestions([]);
                                                window.location.reload();
                                            }
                                        }}
                                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Icon name="trash" size={14} /> Clear Local Data & Reset App
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* BULK EXPORT MODAL */}
            {
                showBulkExportModal && (
                    <BulkExportModal
                        isOpen={showBulkExportModal}
                        onClose={() => setShowBulkExportModal(false)}
                        onExport={handleBulkExport}
                        totalQuestions={questions.length}
                        filteredQuestionsCount={uniqueFilteredQuestions.length}
                        rejectedCount={rejectedCount}
                    />
                )
            }
        </div >
    );
};

export default App;
