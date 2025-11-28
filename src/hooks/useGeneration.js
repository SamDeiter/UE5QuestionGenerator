import { useState } from 'react';
import { generateContent } from '../services/gemini';
import { constructSystemPrompt } from '../services/promptBuilder';
import { parseQuestions } from '../utils/helpers';

export const useGeneration = (
    config,
    setConfig,
    effectiveApiKey,
    isApiReady,
    isTargetMet,
    maxBatchSize,
    getFileContext,
    checkAndStoreQuestions,
    addQuestionsToState,
    updateQuestionInState,
    handleLanguageSwitch,
    showMessage,
    setStatus,
    setShowNameModal,
    setShowAdvancedConfig,
    setShowApiError,
    setShowHistory,
    translationMap,
    allQuestionsMap
) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);

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
            const text = await generateContent(effectiveApiKey, systemPrompt, userPrompt, setStatus, config.temperature, config.model);
            let newQuestions = parseQuestions(text);
            if (newQuestions.length === 0) throw new Error("Failed to parse generated questions.");
            const taggedQuestions = newQuestions.map(q => ({ ...q, language: config.language }));
            const uniqueNewQuestions = await checkAndStoreQuestions(taggedQuestions);

            addQuestionsToState(uniqueNewQuestions, false);

            setStatus('');
        } catch (err) { console.error(err); setStatus('Error'); showMessage(`Generation Error: ${err.message}. Please try again.`, 10000); } finally { setIsGenerating(false); }
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
                addQuestionsToState([newQuestion], false); // showHistory is handled by caller usually, but here we assume false or pass it in? 
                // Actually, handleTranslateSingle in App.jsx used showHistory state. 
                // We might need to pass showHistory or just default to false/true.
                // For now, let's assume we add to the active view.

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
        const sys = constructSystemPrompt(config, getFileContext());
        const prompt = `Generate 2 NEW unique questions based on: "${q.question}". Output in Markdown Table.`;
        try {
            const text = await generateContent(effectiveApiKey, sys, prompt, setStatus);
            const newQs = parseQuestions(text);
            if (newQs.length > 0) {
                const uniqueNewQuestions = await checkAndStoreQuestions(newQs);
                addQuestionsToState(uniqueNewQuestions, false); // Assuming showHistory is false or we don't care

                showMessage(`Added ${uniqueNewQuestions.length} new variations.`, 3000);
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
                    addQuestionsToState([newQuestion], false);
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

    return {
        isGenerating,
        isProcessing,
        translationProgress,
        handleGenerate,
        handleTranslateSingle,
        handleExplain,
        handleVariate,
        handleCritique,
        handleBulkTranslateMissing
    };
};
