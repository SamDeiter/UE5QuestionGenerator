import { useState } from 'react';
import { generateContent, generateCritique } from '../services/gemini';
import { constructSystemPrompt } from '../services/promptBuilder';
import { parseQuestions } from '../utils/helpers';
import { analyzeRequest, estimateTokens } from '../utils/tokenCounter';
import { logGeneration, logQuestion } from '../utils/analyticsStore';

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
    setShowApiError,
    setShowHistory,
    translationMap,
    allQuestionsMap
) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    /**
     * Intelligently converts a Multiple Choice question to True/False format
     * Creates a statement from the question + correct answer, randomly makes it TRUE or FALSE
     */
    const convertMCtoTF = (mcQuestion, difficulty) => {
        const correctAnswerText = mcQuestion.options[mcQuestion.correct];
        const wrongAnswers = Object.entries(mcQuestion.options)
            .filter(([key, val]) => key !== mcQuestion.correct && val && val.trim())
            .map(([, val]) => val);

        // Check if the original question is already effectively True/False
        const lowerCorrect = correctAnswerText.trim().toLowerCase().replace(/[.,!]$/, '');
        const isBooleanAnswer = ['true', 'false', 'yes', 'no'].includes(lowerCorrect);

        let newStatement = mcQuestion.question.trim().replace(/\?$/, '');
        let makeItTrue = true; // Default
        let targetAnswer = correctAnswerText;

        if (isBooleanAnswer) {
            // PRESERVE MODE: If original answer is True/False, we keep the statement as is.
            // We cannot easily flip the truthiness of a statement without complex NLP (e.g. adding "not").
            // So we force the new question to match the original truthiness.

            // If original correct was "TRUE" or "YES" -> New Correct is A (TRUE)
            if (['true', 'yes'].includes(lowerCorrect)) {
                makeItTrue = true;
            }
            // If original correct was "FALSE" or "NO" -> New Correct is B (FALSE)
            else {
                makeItTrue = false;
            }

            // Statement is just the original question text (which is likely a statement)
            newStatement = newStatement;
        } else {
            // STANDARD MODE: Randomly decide if this will be a TRUE or FALSE question (50/50)
            makeItTrue = Math.random() > 0.5;
            targetAnswer = makeItTrue ? correctAnswerText : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] || 'incorrect';

            // 1. Handle "Can you..." -> "You can [stem] [answer]"
            if (/^Can you/i.test(newStatement)) {
                let stem = newStatement.replace(/^Can you\s+/i, '');
                newStatement = `You can ${stem} ${targetAnswer}`;
            }
            // 2. Handle "Is..." -> "[Subject] is [Answer]"
            else if (/^Is\s+/i.test(newStatement)) {
                let stem = newStatement.replace(/^Is\s+/i, '');
                newStatement = `${stem} is ${targetAnswer}`;
            }
            // 3. Handle "What/Which..." -> "[Stem] is [Answer]"
            else {
                // Check for WH- words
                const isWhQuestion = /^(What|Which|How|Where|When|Why)\s+/i.test(newStatement);

                if (isWhQuestion) {
                    let stem = newStatement
                        .replace(/^(What|Which|How|Where|When|Why)\s+(is|are|does|do|can|should|would)\s+/i, '')
                        .trim();
                    newStatement = `${stem} is ${targetAnswer}`;
                } else {
                    // Fallback for other structures: append answer
                    newStatement = `${newStatement} is ${targetAnswer}`;
                }
            }
        }

        // Cleanup: Remove double spaces, capitalize, add period
        newStatement = newStatement.replace(/\s+/g, ' ').trim();
        newStatement = newStatement.charAt(0).toUpperCase() + newStatement.slice(1);
        if (!newStatement.endsWith('.')) newStatement += '.';

        return {
            ...mcQuestion,
            type: 'True/False',
            difficulty: difficulty,
            question: newStatement,
            options: { A: 'TRUE', B: 'FALSE', C: '', D: '' },
            correct: makeItTrue ? 'A' : 'B',
            originalMC: mcQuestion.question // Keep original for reference
        };
    };

    const handleGenerate = async () => {
        if (!config.creatorName) { showMessage("Please enter your Creator Name to start generating.", 5000); setShowNameModal(true); return; }
        if (!isApiReady) {
            setShowApiError(true);
            showMessage("API key is required. Please enter it in Settings.", 5000);
            return;
        }

        if (config.difficulty !== 'Balanced All' && isTargetMet) { showMessage(`Quota met for ${config.difficulty}! Change difficulty/type or discipline to continue.`, 5000); return; }

        setIsGenerating(true); setShowHistory(false); setStatus('Drafting Scenarios...');
        const startTime = Date.now();

        // Collect recent rejected questions to learn from (up to 5, matching current discipline)
        const rejectedExamples = Array.from(allQuestionsMap.values())
            .flat()
            .filter(q => q.status === 'rejected' && q.rejectionReason && q.discipline === config.discipline)
            .slice(-5); // Take most recent 5

        const systemPrompt = constructSystemPrompt(config, getFileContext(), rejectedExamples);
        const userPrompt = `Generate ${config.batchSize} scenario-based questions for ${config.discipline} in ${config.language}. Focus: ${config.difficulty}. Ensure links work for UE 5.7 or latest available.`;

        // Analyze token usage before API call
        const tokenAnalysis = analyzeRequest(systemPrompt, userPrompt, 2000, config.model || 'gemini-2.0-flash');


        try {
            // RELIABLE GENERATION: Accept whatever AI generates, convert as needed
            const text = await generateContent(effectiveApiKey, systemPrompt, userPrompt, setStatus, config.temperature, config.model);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Get grounding sources from the last API call
            const groundingSources = window.__lastGroundingSources || [];
            const groundedUrls = new Set(groundingSources.map(s => s.url.toLowerCase()));
            console.log('🔍 Verifiable sources from search:', groundingSources.length);

            let newQuestions = parseQuestions(text);
            if (newQuestions.length === 0) {
                console.error("Failed to parse. Raw text received:", text);
                const truncatedText = text.length > 100 ? text.substring(0, 100) + "..." : text;
                throw new Error(`Failed to parse questions. Raw: "${truncatedText}"`);
            }

            // FILTER: Strictly remove forbidden domains (YouTube, Vimeo)
            const forbiddenDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'vertexaisearch'];
            const initialCount = newQuestions.length;
            newQuestions = newQuestions.filter(q => {
                const url = (q.sourceUrl || '').toLowerCase();
                return !forbiddenDomains.some(domain => url.includes(domain));
            });

            if (newQuestions.length < initialCount) {
                console.warn(`Filtered out ${initialCount - newQuestions.length} questions with forbidden sources.`);
                showMessage(`Removed ${initialCount - newQuestions.length} questions with invalid sources.`);
            }

            // Parse the requested difficulty and type from config
            const [requestedDifficulty, requestedType] = config.difficulty.split(' ');
            const expectedType = requestedType === 'T/F' ? 'True/False' : 'Multiple Choice';

            // SOURCE VERIFICATION: Check if URLs match grounding sources
            newQuestions = newQuestions.map(q => {
                let updatedQ = { ...q };
                const url = (updatedQ.sourceUrl || '').toLowerCase();

                // Check if URL is verified from grounding
                if (url && groundedUrls.size > 0) {
                    // Try to match URL against grounded sources
                    const isVerified = Array.from(groundedUrls).some(groundedUrl =>
                        url.includes(groundedUrl) || groundedUrl.includes(url.split('/').slice(-1)[0])
                    );
                    updatedQ.sourceVerified = isVerified;

                    // If we have grounding sources but URL doesn't match, it might be hallucinated
                    if (!isVerified && url.includes('epicgames.com')) {
                        updatedQ.sourceVerified = 'unverified'; // Could be valid but not from this search
                        console.warn(`⚠️ URL not in grounding sources: ${url}`);
                    }
                } else if (!url) {
                    updatedQ.sourceVerified = 'missing';
                } else if (url.includes('epicgames.com')) {
                    updatedQ.sourceVerified = 'assumed'; // Looks valid but no grounding to verify
                } else {
                    updatedQ.sourceVerified = false;
                    updatedQ.invalidUrl = true;
                }

                // Apply difficulty and type conversion
                if (requestedDifficulty !== 'Balanced') {
                    if (expectedType === 'True/False' && q.type === 'Multiple Choice') {
                        updatedQ = convertMCtoTF(updatedQ, requestedDifficulty);
                        updatedQ.sourceVerified = q.sourceVerified; // Preserve verification status
                    } else {
                        updatedQ.difficulty = requestedDifficulty;
                    }
                }

                return updatedQ;
            });

            // Clear grounding sources for next request
            window.__lastGroundingSources = [];

            // Calculate metrics
            const outputTokens = estimateTokens(text);
            const totalCost = tokenAnalysis.cost.estimated;
            const costPerQuestion = newQuestions.length > 0 ? (totalCost / newQuestions.length) : 0;

            // Count verification stats
            const verifiedCount = newQuestions.filter(q => q.sourceVerified === true).length;
            const unverifiedCount = newQuestions.filter(q => q.sourceVerified === 'unverified' || q.sourceVerified === 'assumed').length;
            const missingCount = newQuestions.filter(q => q.sourceVerified === 'missing').length;
            console.log(`📊 Source verification: ${verifiedCount} verified, ${unverifiedCount} unverified, ${missingCount} missing`);

            // ANSWER VALIDATION: Check if correct answer appears in source excerpt
            newQuestions = newQuestions.map(q => {
                if (q.type === 'Multiple Choice' && q.sourceExcerpt && q.options && q.correct) {
                    const correctAnswer = q.options[q.correct] || '';
                    const excerpt = (q.sourceExcerpt || '').toLowerCase();
                    const answerWords = correctAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 3);

                    // Check if key words from the answer appear in the source
                    const matchingWords = answerWords.filter(word => excerpt.includes(word));
                    const matchRatio = answerWords.length > 0 ? matchingWords.length / answerWords.length : 0;

                    if (matchRatio < 0.3) {
                        // Answer doesn't seem to match source excerpt
                        console.warn(`⚠️ ANSWER MISMATCH: "${correctAnswer}" not found in source excerpt for question: "${q.question.substring(0, 50)}..."`);
                        return { ...q, answerMismatch: true };
                    }
                }
                return q;
            });

            // Count mismatches
            const mismatchCount = newQuestions.filter(q => q.answerMismatch).length;
            if (mismatchCount > 0) {
                console.warn(`🚨 ${mismatchCount} questions have answer/source mismatches - review carefully!`);
                showMessage(`⚠️ ${mismatchCount} questions may have wrong answers - check source excerpts!`, 8000);
            }

            // Enrich questions with metadata
            const enrichedQuestions = newQuestions.map(q => ({
                ...q,
                language: config.language,
                estimatedCost: costPerQuestion,
                generationTime: duration,
                model: config.model || 'gemini-2.0-flash',
                groundingSources: groundingSources.length > 0 ? groundingSources.slice(0, 3) : null // Store top 3 sources
            }));

            // Save to storage and get unique ones
            const uniqueNewQuestions = await checkAndStoreQuestions(enrichedQuestions);

            const avgQuality = uniqueNewQuestions.reduce((sum, q) => sum + (q.qualityScore || 0), 0) / (uniqueNewQuestions.length || 1);

            // Log generation to analytics
            const generationId = logGeneration({
                discipline: config.discipline,
                difficulty: config.difficulty,
                batchSize: config.batchSize,
                tokensUsed: { input: tokenAnalysis.input.total, output: outputTokens },
                duration,
                questionsGenerated: uniqueNewQuestions.length,
                averageQuality: Math.round(avgQuality),
                success: true,
                model: config.model || 'gemini-2.0-flash',
                estimatedCost: totalCost
            });

            // Log each question
            uniqueNewQuestions.forEach(q => {
                logQuestion({
                    id: q.id,
                    generationId,
                    created: q.dateAdded,
                    status: 'pending',
                    qualityScore: q.qualityScore,
                    discipline: q.discipline,
                    difficulty: q.difficulty,
                    type: q.type,
                    questionText: q.question
                });
            });

            addQuestionsToState(uniqueNewQuestions, false);


            setStatus('');
        } catch (err) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Log failed generation
            logGeneration({
                discipline: config.discipline,
                difficulty: config.difficulty,
                batchSize: config.batchSize,
                tokensUsed: tokenAnalysis ? { input: tokenAnalysis.input.total, output: 0 } : { input: 0, output: 0 },
                duration,
                questionsGenerated: 0,
                averageQuality: 0,
                success: false,
                errorMessage: err.message,
                model: config.model || 'gemini-2.0-flash',
                estimatedCost: tokenAnalysis ? tokenAnalysis.cost.estimated : 0
            });

            console.error(err);
            setStatus('Error');
            showMessage(`Generation Error: ${err.message}. Please try again.`, 10000);
        } finally {
            setIsGenerating(false);
        }
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

        try {
            const { score, text, rewrite, changes } = await generateCritique(effectiveApiKey, q);
            updateQuestionInState(q.id, (item) => ({
                ...item,
                critique: text,
                critiqueScore: score,
                suggestedRewrite: rewrite,
                rewriteChanges: changes
            }));
            showMessage('Critique & Rewrite Ready', 3000);
        } catch (e) {
            console.error("Critique failed:", e);
            setStatus('Fail');
            showMessage(`Critique Failed: ${e.message}`, 5000);
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
