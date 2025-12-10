import { useState } from 'react';
import { generateContent } from '../../services/gemini';
import { parseQuestions } from '../../utils/helpers';

/**
 * Custom hook for question translation operations.
 * Handles both single question translation and bulk translation of missing languages.
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.effectiveApiKey - The API key to use
 * @param {boolean} params.isApiReady - Whether the API is ready
 * @param {Function} params.checkAndStoreQuestions - Function to store questions
 * @param {Function} params.addQuestionsToState - Function to add questions to state
 * @param {Function} params.handleLanguageSwitch - Function to switch active language
 * @param {Function} params.showMessage - Function to show messages to user
 * @param {Function} params.setStatus - Function to set status message
 * @param {Function} params.setShowHistory - Function to control history visibility
 * @param {Map} params.translationMap - Map of existing translations
 * @param {Map} params.allQuestionsMap - Map of all questions
 * @returns {Object} Translation handlers and state
 */
export const useTranslation = ({
    effectiveApiKey,
    isApiReady,
    checkAndStoreQuestions,
    addQuestionsToState,
    handleLanguageSwitch,
    showMessage,
    setStatus,
    setShowHistory,
    translationMap,
    allQuestionsMap
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);

    /**
     * Translates a single question to a target language
     * @param {Object} q - The question object to translate
     * @param {string} targetLang - Target language (e.g., 'Chinese (Simplified)')
     */
    const handleTranslateSingle = async (q, targetLang) => {
        if (!isApiReady) {
            showMessage("API key is required for translation. Please enter it in the settings panel.", 5000);
            return;
        }

        setIsProcessing(true);
        setStatus(`Translating question to ${targetLang}...`);

        // JSON Prompt for reliability
        const systemPrompt = `You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from ${q.language || 'English'} to ${targetLang}. 
        CRITICAL RULES:
        1. Return ONLY valid JSON. No markdown formatting, no explanations.
        2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
        3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
        4. Maintain exact JSON structure.`;

        const userPrompt = `Translate this object:\n${JSON.stringify({
            Discipline: q.discipline,
            Type: q.type,
            Difficulty: q.difficulty,
            Question: q.question,
            OptionA: q.options.A,
            OptionB: q.options.B,
            OptionC: q.options.C || '',
            OptionD: q.options.D || '',
            CorrectLetter: q.correct,
            SourceURL: q.sourceUrl,
            SourceExcerpt: q.sourceExcerpt
        }, null, 2)}`;

        try {
            const text = await generateContent(effectiveApiKey, systemPrompt, userPrompt, setStatus);

            // Attempt to parse JSON response
            let translatedData = null;
            try {
                // Strip code fence if present
                const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                translatedData = JSON.parse(cleanText);
            } catch (e) {
                console.warn("JSON parse failed, trying parseQuestions fallback", e);
            }

            // Fallback to helper parser or use parsed JSON
            const translatedQs = translatedData ? parseQuestions(JSON.stringify(translatedData)) : parseQuestions(text);

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
                addQuestionsToState([newQuestion], false);
                handleLanguageSwitch(targetLang);

                showMessage(`Translated to ${targetLang} and saved.`, 3000);
            } else {
                throw new Error("Parser returned no questions from translation.");
            }
        } catch (e) {
            console.error("Translation error:", e);
            setStatus('Translation Failed');
            showMessage(`Translation Failed: ${e.message}`, 5000);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Bulk translates all missing translations for accepted questions
     * Targets Chinese (Simplified), Japanese, and Korean
     */
    const handleBulkTranslateMissing = async () => {
        if (isProcessing) return;
        if (!isApiReady) {
            showMessage("API key is required for bulk translation. Please enter it in the settings panel.", 5000);
            return;
        }

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
                // Only translate accepted English questions with valid sources
                if (q.status === 'accepted' &&
                    (q.language || 'English') === 'English' &&
                    q.sourceUrl &&
                    !q.invalidUrl &&
                    !existingLangs.has(targetLang)) {
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
        const totalQueueSize = translationQueue.length;

        for (const { question: q, targetLang } of translationQueue) {
            const systemPrompt = `You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from ${q.language || 'English'} to ${targetLang}. 
            CRITICAL RULES:
            1. Return ONLY valid JSON. No markdown formatting.
            2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
            3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
            4. Maintain exact JSON structure.`;

            const userPrompt = `Translate this object:\n${JSON.stringify({
                Discipline: q.discipline,
                Type: q.type,
                Difficulty: q.difficulty,
                Question: q.question,
                OptionA: q.options.A,
                OptionB: q.options.B,
                OptionC: q.options.C || '',
                OptionD: q.options.D || '',
                CorrectLetter: q.correct,
                SourceURL: q.sourceUrl,
                SourceExcerpt: q.sourceExcerpt
            }, null, 2)}`;

            try {
                setStatus(`Translating: ${q.uniqueId.substring(0, 4)} -> ${targetLang}...`);
                const text = await generateContent(effectiveApiKey, systemPrompt, userPrompt, setStatus);

                let translatedData = null;
                try {
                    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                    translatedData = JSON.parse(cleanText);
                } catch {
                    // ignore JSON parse error, let parseQuestions handle it
                }

                const translatedQs = translatedData ? parseQuestions(JSON.stringify(translatedData)) : parseQuestions(text);

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

            const totalProgress = Math.floor((generatedCount / totalQueueSize) * 100);
            setTranslationProgress(totalProgress);
        }

        showMessage(`Bulk translation complete! Generated ${generatedCount} new translations.`, 7000);
        setIsProcessing(false);
    };

    return {
        isProcessing,
        translationProgress,
        handleTranslateSingle,
        handleBulkTranslateMissing
    };
};
