import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

import { generateContent } from './services/gemini';
import { fetchQuestionsFromSheets, saveQuestionsToSheets } from './services/googleSheets';
import { chunkArray, formatUrl, sanitizeText, stripHtmlTags, safe, formatDate, parseCSVLine, parseQuestions, downloadFile, filterDuplicateQuestions } from './utils/helpers';
import { APP_VERSION, LANGUAGE_FLAGS, LANGUAGE_CODES, CATEGORY_KEYS, TARGET_PER_CATEGORY, TARGET_TOTAL, FIELD_DELIMITER } from './utils/constants';

const App = () => {
    const [appMode, setAppMode] = useState('landing'); // 'landing', 'create', 'review'
    const [isCloudReady, setIsCloudReady] = useState(false); // Track actual cloud connection status
    const [showClearModal, setShowClearModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showBulkExportModal, setShowBulkExportModal] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);

    const [filterByCreator, setFilterByCreator] = useState(false);

    // --- ENVIRONMENT AND API KEY STATUS CHECK ---
    // If __app_id is defined, assume we are in the Canvas environment and the API key will be auto-injected.
    const isInternalEnvironment = typeof window.__app_id !== 'undefined';
    const isAuthReady = true; // In local/Sheets mode, we are always "ready" for local ops.

    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ue5_gen_config');
        const defaults = { discipline: 'Technical Art', batchSize: '6', difficulty: 'Easy MC', language: 'English', creatorName: '', reviewerName: '', apiKey: '', sheetUrl: '' };
        const constInitialConfig = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        // Ensure creatorName and reviewerName defaults are restored if removed from storage
        constInitialConfig.creatorName = constInitialConfig.creatorName || '';
        constInitialConfig.reviewerName = constInitialConfig.reviewerName || '';
        constInitialConfig.apiKey = constInitialConfig.apiKey || ''; // Ensure API key is loaded
        constInitialConfig.sheetUrl = constInitialConfig.sheetUrl || '';
        if (constInitialConfig.difficulty === 'Balanced All') constInitialConfig.difficulty = 'Easy MC';
        return constInitialConfig;
    });

    // Computed values for API key status and effective key
    const isApiReady = isInternalEnvironment || (config.apiKey && config.apiKey.length > 5);
    const effectiveApiKey = isInternalEnvironment ? "" : config.apiKey;

    // Map of UniqueID -> List of Question Objects (all languages)
    const [allQuestionsMap, setAllQuestionsMap] = useState(new Map());

    const [questions, setQuestions] = useState(() => {
        const saved = localStorage.getItem('ue5_gen_questions');
        return saved ? JSON.parse(saved) : [];
    });

    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('pending');
    const [historicalQuestions, setHistoricalQuestions] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const fileInputRef = useRef(null);



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

            if (baseQ && baseQ.status === 'accepted' && !countedIds.has(baseQ.uniqueId)) {
                const typeAbbrev = baseQ.type === 'True/False' ? 'T/F' : 'MC';
                const key = `${baseQ.difficulty} ${typeAbbrev}`;
                if (counts.hasOwnProperty(key)) {
                    counts[key]++;
                    countedIds.add(baseQ.uniqueId);
                }
            }
        });
        return counts;
    }, [allQuestionsMap]);

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

    useEffect(() => {
        if (maxBatchSize > 0 && config.difficulty !== 'Balanced All') {
            const recommendedSize = Math.max(1, Math.min(10, Math.floor(maxBatchSize / 2)));
            setConfig(prev => ({ ...prev, batchSize: recommendedSize.toString() }));
        } else if (config.difficulty === 'Balanced All') {
            setConfig(prev => ({ ...prev, batchSize: Math.max(6, Math.min(12, maxBatchSize)).toString() }));
        } else if (maxBatchSize === 0 && config.difficulty !== 'Balanced All') {
            setConfig(prev => ({ ...prev, batchSize: '0' }));
        }
    }, [config.difficulty, maxBatchSize]);

    useEffect(() => { if (!config.creatorName) setShowNameModal(true); }, []);
    useEffect(() => { localStorage.setItem('ue5_gen_config', JSON.stringify(config)); }, [config]);
    useEffect(() => localStorage.setItem('ue5_gen_questions', JSON.stringify(questions)), [questions]);

    const handleDeleteAllQuestions = async () => {
        setShowClearModal(false);
        setQuestions([]);
        setHistoricalQuestions([]);
        showMessage("Local session cleared.", 3000);
    };

    const checkAndStoreQuestions = async (newQuestions) => {
        // In Google Sheets mode, we don't automatically sync every generation to the sheet.
        // We only sync when the user explicitly exports/saves.
        // So this function mainly serves to return the questions to be added to local state.
        return newQuestions;
    };

    const handleLanguageSwitch = (lang) => {
        setConfig(prev => ({ ...prev, language: lang }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'batchSize' && config.difficulty === 'Balanced All') {
            const num = parseInt(value);
            if (num % 6 !== 0) showMessage("For Balanced All mode, the batch size should be a multiple of 6 (e.g., 6, 12, 18) for an even distribution.", 3000);
        }
        setConfig(prev => ({ ...prev, [name]: value }));
        // If user changes language in dropdown, update global language filter
        if (name === 'language') {
            handleLanguageSwitch(value);
        }
    };

    const handleNameSave = (name) => {
        setConfig(prev => ({ ...prev, creatorName: name, reviewerName: name }));
        setShowNameModal(false);
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const allowedTypes = ['text/', 'application/json', 'application/javascript', 'application/xml', 'application/csv'];
        const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.js', '.html', '.css', '.xml', '.py', '.cpp', '.h', '.cs'];
        const validFiles = newFiles.filter(file => {
            const isTextType = file.type.startsWith('text/') || allowedTypes.includes(file.type);
            const hasTextExt = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
            return isTextType || hasTextExt;
        });

        const csvFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.csv'));
        const otherFiles = validFiles.filter(f => !f.name.toLowerCase().endsWith('.csv'));

        if (csvFiles.length > 0) {
            csvFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const content = ev.target.result;
                    const importedQuestions = [];
                    const lines = content.split('\n');
                    const header = lines[0] ? lines[0].split(FIELD_DELIMITER) : [];

                    const fileName = file.name;
                    let fileLanguage = null;

                    // 1. Check for full language names (e.g. "Chinese_(Simplified)")
                    Object.keys(LANGUAGE_FLAGS).forEach(lang => {
                        const safeLang = lang.replace(/ /g, '_');
                        if (fileName.toLowerCase().includes(safeLang.toLowerCase()) || fileName.toLowerCase().includes(lang.toLowerCase())) {
                            fileLanguage = lang;
                        }
                    });

                    // 2. Fallback: Check for language codes (e.g. _CN_, _JP_) if no full name found
                    if (!fileLanguage) {
                        Object.entries(LANGUAGE_CODES).forEach(([lang, code]) => {
                            const regex = new RegExp(`(^|[_\-])${code}([_\-\.]|$)`, 'i');
                            if (regex.test(fileName)) {
                                fileLanguage = lang;
                            }
                        });
                    }

                    if (header.length > 5 && header[0].includes('ID') && header[2].includes('Discipline')) {
                        lines.slice(1).forEach((line, idx) => {
                            if (!line.trim()) return;
                            const cols = parseCSVLine(line);
                            if (cols.length < 10) return;
                            const uniqueId = cols[1] && cols[1].length > 5 ? cols[1] : crypto.randomUUID();
                            importedQuestions.push({
                                id: Date.now() + idx + Math.random(),
                                uniqueId: uniqueId,
                                discipline: cols[2] || "Imported",
                                type: cols[3] || "Multiple Choice",
                                difficulty: cols[4] || "Easy",
                                question: cols[5] || "",
                                options: { A: cols[6] || "", B: cols[7] || "", C: cols[8] || "", D: cols[9] || "" },
                                correct: cols[10] || "",
                                dateAdded: cols[11] || new Date().toISOString(),
                                sourceUrl: cols[12] || "",
                                sourceExcerpt: cols[13] || "",
                                creatorName: cols[14] || config.creatorName || "",
                                reviewerName: cols[15] || "",
                                status: 'accepted',
                                language: cols[16] || fileLanguage || "English"
                            });
                        });
                        if (importedQuestions.length > 0) {
                            console.log(`[CSV Import] Detected file language: ${fileLanguage || 'None (defaulting to English)'}`);
                            console.log(`[CSV Import] Sample question languages:`, importedQuestions.slice(0, 3).map(q => ({ id: q.uniqueId, lang: q.language })));
                            addQuestionsToState(importedQuestions, showHistory);
                            showMessage(`Imported ${importedQuestions.length} questions from CSV (Language: ${fileLanguage || 'English'}).`, 4000);
                        }
                    } else {
                        setFiles(prev => [...prev, { name: file.name, content: content, size: file.size }]);
                    }
                };
                reader.readAsText(file);
            });
        }
        if (otherFiles.length > 0) {
            otherFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => { setFiles(prev => [...prev, { name: file.name, content: ev.target.result, size: file.size }]); };
                reader.readAsText(file);
            });
        }
        if (validFiles.length < newFiles.length) showMessage("Skipped non-text files (images/binaries). Upload text-based files only.", 5000);
    };

    const removeFile = (index) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

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

    const constructSystemPrompt = () => {
        let batchNum = parseInt(config.batchSize) || 6;
        let easyCount = 0; let mediumCount = 0; let hardCount = 0;
        let targetType = 'Multiple Choice and True/False';
        let mcCount = 0; let tfCount = 0;
        const [difficulty, type] = config.difficulty.split(' ');
        if (difficulty === 'Balanced') {
            if (batchNum % 6 !== 0) batchNum = Math.ceil(batchNum / 6) * 6;
            const countPerCategory = batchNum / 6;
            easyCount = countPerCategory; mediumCount = countPerCategory; hardCount = countPerCategory;
            targetType = 'Multiple Choice and True/False'; mcCount = countPerCategory * 3; tfCount = countPerCategory * 3;
        } else {
            if (difficulty === 'Easy') easyCount = batchNum; else if (difficulty === 'Medium') mediumCount = batchNum; else if (difficulty === 'Hard') hardCount = batchNum;
            if (type === 'MC') { targetType = 'Multiple Choice ONLY'; mcCount = batchNum; } else if (type === 'T/F') { targetType = 'True/False ONLY'; tfCount = batchNum; }
        }
        const difficultyPrompt = (difficulty === 'Balanced') ? `Generate approximately ${easyCount} Easy, ${mediumCount} Medium, and ${hardCount} Hard questions. Aim for ${mcCount} Multiple Choice questions and ${tfCount} True/False questions for a balanced batch.` : `Generate exactly ${batchNum} questions of difficulty: ${difficulty}.`;
        return `
## Universal UE5 Scenario-Based Question Generator — Gemini Version
Role: You are a senior Unreal Engine 5 technical writer. Create short, clear, scenario-driven questions in Simplified Technical English (STE).
**FORMATTING INSTRUCTION:** You MUST enclose key technical concepts (like Nanite, Lumen, Blueprints, Virtual Shadow Maps) in HTML bold tags (e.g., <b>Nanite</b>) in the Question and Answer columns.
Discipline: ${config.discipline}
Target Language: ${config.language}
Question Type: ${targetType}
**LANGUAGE STRICTNESS:** Output ONLY in ${config.language}. Do NOT provide bilingual text.
Question Format:
| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
- ID starts at 1.
- Difficulty levels: Easy / Medium / Hard.
- For True/False questions: OptionA=TRUE, OptionB=FALSE. CorrectLetter=A/B.
- **CRITICAL RULE:** True/False questions must be a SINGLE assertion.
- **TYPE RULE:** If Question Type is 'Multiple Choice ONLY', do NOT generate True/False questions. If Question Type is 'True/False ONLY', do NOT generate Multiple Choice questions.
Sourcing:
1. Official Epic Games Documentation (dev.epicgames.com/documentation)
2. Attached Local Files
**FORBIDDEN SOURCES:** Do NOT use forums, Reddit, community wikis, or external video platforms like YouTube.
Output:
- **OUTPUT INSTRUCTION:** ${difficultyPrompt}
${getFileContext()}
`;
    };

    const handleGenerate = async () => {
        if (!config.creatorName) { showMessage("Please enter your Creator Name to start generating.", 5000); setShowNameModal(true); return; }
        if (!isApiReady) { showMessage("API key is required for generation. Please enter it in the settings panel.", 5000); return; }

        if (config.difficulty !== 'Balanced All' && isTargetMet) { showMessage(`Quota met for ${config.difficulty}! Change difficulty/type or discipline to continue.`, 5000); return; }

        setIsGenerating(true); setShowHistory(false); setStatus('Drafting Scenarios...');
        const systemPrompt = constructSystemPrompt();
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

    const handleVariate = async (q) => {
        if (!isApiReady) { showMessage("API key is required for creation. Please enter it in the settings panel.", 5000); return; }

        setIsProcessing(true); setStatus('Creating variations...');
        const sys = constructSystemPrompt();
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

    const getCSVContent = (validQuestions, creatorName, reviewerName, includeHeaders = true) => {
        const headers = ["ID", "Question ID", "Discipline", "Type", "Difficulty", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Generation Date", "Source URL", "Source Excerpt", "Creator", "Reviewer", "Language"];
        let csvContent = includeHeaders ? headers.map(safe).join(FIELD_DELIMITER) + '\n' : '';
        const generationDate = formatDate(new Date());
        validQuestions.forEach((row, i) => {
            const cleanedSourceUrl = row.sourceUrl && !row.sourceUrl.includes("grounding-api") ? row.sourceUrl : "";
            const o = row.options || {};
            const rowData = [(i + 1).toString(), row.uniqueId, row.discipline, row.type, row.difficulty, row.question, o.A, o.B, o.C, o.D || "", row.correct, generationDate, cleanedSourceUrl, row.sourceExcerpt, creatorName, reviewerName, row.language || "English"];
            csvContent += rowData.map(safe).join(FIELD_DELIMITER) + '\n';
        });
        return csvContent;
    };

    const handleExportByGroup = () => {
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;
        const valid = sourceList.filter(q => q.status !== 'rejected');

        if (valid.length === 0) { setStatus("No accepted questions to export."); setTimeout(() => setStatus(''), 3000); return; }

        // NEW GROUPING: Language, Discipline, Difficulty, Type
        const groupedData = valid.reduce((acc, q) => {
            const typeAbbrev = q.type === 'True/False' ? 'T/F' : 'MC';
            // Use a unique key combining all segmentation requirements
            const key = `${q.language || 'English'}_${q.discipline}_${q.difficulty}_${typeAbbrev}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(q);
            return acc;
        }, {});

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

    const handleLoadFromSheets = async () => {
        if (!config.sheetUrl) { showMessage("Please enter a Google Apps Script URL first.", 3000); return; }

        setIsProcessing(true);
        setStatus("Loading from Google Sheets...");
        setShowExportMenu(false);

        try {
            const data = await fetchQuestionsFromSheets(config.sheetUrl);
            const loadedQuestions = data.map(q => ({
                ...q,
                id: Date.now() + Math.random(),
                status: 'accepted'
            }));

            const uniqueNew = await checkAndStoreQuestions(loadedQuestions);
            addQuestionsToState(uniqueNew, false);
            showMessage(`Successfully loaded ${loadedQuestions.length} questions from Sheets!`, 5000);
        } catch (e) {
            console.error("Load Error:", e);
            showMessage(`Load Failed: ${e.message}. (Ensure Script Access is set to 'Anyone')`, 7000);
        } finally {
            setIsProcessing(false);
        }
    };

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

    const handleUpdateStatus = (id, newStatus) => {
        updateQuestionInState(id, (q) => ({
            ...q,
            status: newStatus,
            critique: newStatus === 'accepted' ? null : q.critique
        }));
    };

    const handleSelectCategory = (categoryKey) => {
        setConfig(prev => ({ ...prev, difficulty: categoryKey }));
    };

    const uniqueFilteredQuestions = useMemo(() => {
        // Fix: When showing history (or Review Mode), we should show ALL questions (current + history), not just history.
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;
        const currentLanguage = config.language;
        const targetDifficulty = config.difficulty.split(' ')[0];
        const targetTypeAbbrev = config.difficulty.split(' ')[1];
        const targetType = targetTypeAbbrev === 'MC' ? 'Multiple Choice' : 'True/False';

        const filteredByGlobal = sourceList.filter(q => {
            let statusMatch = true;
            if (!showHistory && filterMode !== 'all') {
                statusMatch = q.status === filterMode;
            }

            const textMatch = (q.question && q.question.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (q.uniqueId && q.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (q.discipline && q.discipline.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (q.difficulty && q.difficulty.toLowerCase().includes(searchTerm.toLowerCase()));

            let creatorMatch = true;
            if (filterByCreator && config.creatorName) {
                const qCreator = (q.creatorName || '').toLowerCase().trim();
                const configCreator = config.creatorName.toLowerCase().trim();
                creatorMatch = (qCreator === configCreator);
            }

            const disciplineMatch = q.discipline === config.discipline;

            return statusMatch && textMatch && creatorMatch && disciplineMatch;
        });

        const grouped = new Map();
        filteredByGlobal.forEach(q => {
            const id = q.uniqueId;
            if (!grouped.has(id)) grouped.set(id, []);
            grouped.get(id).push(q);
        });

        const finalDisplayList = [];

        grouped.forEach((variants) => {
            let filteredVariants = variants;
            if (config.difficulty !== 'Balanced All') {
                filteredVariants = variants.filter(v => {
                    const qDiff = (v.difficulty || '').toLowerCase();
                    const vType = (v.type || '').toLowerCase();
                    return (qDiff === targetDifficulty.toLowerCase() && vType === targetType.toLowerCase());
                });
            }

            if (filteredVariants.length === 0) return;

            let selected = null;
            selected = filteredVariants.find(v => (v.language || 'English') === currentLanguage);
            if (!selected) {
                selected = filteredVariants.find(v => (v.language || 'English') === 'English');
            }
            if (!selected) {
                selected = filteredVariants[0];
            }

            if (selected) {
                finalDisplayList.push(selected);
            }
        });

        return finalDisplayList;
    }, [historicalQuestions, questions, config.language, config.discipline, config.difficulty, filterMode, searchTerm, filterByCreator, config.creatorName, showHistory]);

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

    const filteredQuestions = uniqueFilteredQuestions;

    const totalApproved = useMemo(() => {
        return CATEGORY_KEYS.reduce((sum, key) => sum + approvedCounts[key], 0);
    }, [approvedCounts]);

    const overallPercentage = useMemo(() => {
        return Math.min(100, (totalApproved / TARGET_TOTAL) * 100);
    }, [totalApproved]);

    const apiKeyStatus = isInternalEnvironment ? 'Auto-Auth' : (config.apiKey.length > 5 ? 'Loaded' : 'Missing');

    const [showProgressMenu, setShowProgressMenu] = useState(false);

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

    const handleBulkExport = async (exportOptions) => {
        const { format, includeRejected, languages, scope, segmentFiles } = exportOptions;

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
                        <div className="pb-4 space-y-3">
                            <button onClick={handleGenerate} disabled={isGenerating || isTargetMet || maxBatchSize === 0 || !isApiReady} className={`w-full py-4 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isGenerating || isTargetMet || maxBatchSize === 0 || !isApiReady ? 'bg-slate-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'}`}>
                                {isGenerating ? <><Icon name="loader" size={16} className="animate-spin" /> GENERATING...</> : <><Icon name="book-open" size={16} /> GENERATE QUESTIONS</>}
                            </button>

                            <button onClick={handleBulkTranslateMissing} disabled={isProcessing || isGenerating || Array.from(allQuestionsMap.keys()).length === 0 || !isApiReady} className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all border ${isProcessing || isGenerating || Array.from(allQuestionsMap.keys()).length === 0 || !isApiReady ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-950/50 text-indigo-400 hover:bg-indigo-900/50 border-indigo-700'}`}>
                                <Icon name="languages" size={14} /> BULK TRANSLATE (CN/JP/KR)
                            </button>
                        </div>
                        <div className="pt-6 border-t border-slate-800 space-y-3">
                            <div className="flex justify-between items-end"><label className="text-xs font-bold uppercase text-slate-400">Source Files</label>{files.length > 0 && <button onClick={handleDetectTopics} disabled={isDetecting || !isApiReady} className="text-[10px] flex items-center gap-1 text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50">{isDetecting ? "..." : "Detect"}</button>}</div>
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-700 rounded p-4 hover:bg-slate-900 cursor-pointer text-center bg-slate-900/50"><Icon name="upload" className="mx-auto text-slate-600 mb-2" /><p className="text-xs text-slate-500">Upload .csv</p><input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" /></div>
                            {files.map((f, i) => <div key={i} className="flex justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs text-slate-400"><span className="truncate">{f.name}</span><button onClick={() => removeFile(i)} className="text-red-500">x</button></div>)}
                        </div>

                        {/* API Key Configuration - Moved to bottom */}
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
                        </div>

                        {/* Google Sheets URL Configuration - Moved to bottom */}
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
                            {/* EXPORT BUTTON */}
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

                            {/* Only show history toggle in Creation Mode */}
                            {appMode === 'create' && (
                                <button onClick={() => setShowHistory(!showHistory)} className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${showHistory ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'}`} title={showHistory ? 'Back to Current Session' : 'View Full Question History'}><Icon name={showHistory ? 'list' : 'archive'} size={12} />{showHistory ? 'Current Session' : 'Full History'} <span className="text-[10px] bg-slate-950/50 px-1.5 rounded-full">{showHistory ? historicalQuestions.length : questions.length}</span></button>
                            )}

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

                        {appMode === 'review' && uniqueFilteredQuestions.length > 0 ? (
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
        </div>
    );
};

export default App;
