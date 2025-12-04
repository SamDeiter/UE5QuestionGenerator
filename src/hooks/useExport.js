import { useState } from 'react';
import { getCSVContent, segmentQuestions } from '../utils/exportUtils';
import { saveQuestionsToSheets, fetchQuestionsFromSheets, clearQuestionsFromSheets } from '../services/googleSheets';
import { saveQuestionToFirestore, getQuestionsFromFirestore } from '../services/firebase';
import { downloadFile, formatDate } from '../utils/helpers';

export const useExport = (
    config,
    questions,
    historicalQuestions,
    uniqueFilteredQuestions,
    allQuestionsMap,
    showHistory,
    showMessage,
    setStatus,
    setIsProcessing,
    setDatabaseQuestions,
    setAppMode,
    setShowExportMenu,
    setShowBulkExportModal,
    setHistoricalQuestions
) => {

    const handleExportByGroup = () => {
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;
        const valid = sourceList.filter(q => q.status !== 'rejected');

        if (valid.length === 0) { setStatus("No accepted questions to export."); setTimeout(() => setStatus(''), 3000); return; }

        const groupedData = segmentQuestions(valid);

        let filesGenerated = 0;
        const exportDate = new Date();
        const datePart = formatDate(exportDate).replace(/-/g, '');

        Object.keys(groupedData).forEach(groupKey => {
            const groupQuestions = groupedData[groupKey];
            const csvContent = getCSVContent(groupQuestions, config.creatorName, config.reviewerName);

            const fileNameParts = groupKey.replace(/ & /g, '_').replace(/ /g, '_');
            const filename = `${fileNameParts}_${datePart}.csv`;

            downloadFile(csvContent, filename);
            filesGenerated++;
        });

        setStatus(`Exported ${filesGenerated} segmented files.`);
        setTimeout(() => setStatus(''), 5000);
        if (setShowExportMenu) setShowExportMenu(false);
    };

    const handleExportCurrentTarget = () => {
        const sourceList = showHistory ? [...questions, ...historicalQuestions] : questions;

        const targetString = config.difficulty;
        const [targetDiff, targetTypeAbbrev] = targetString.split(' ');
        const targetType = targetTypeAbbrev === 'MC' ? 'Multiple Choice' : 'True/False';

        const valid = sourceList.filter(q =>
            q.status !== 'rejected' &&
            (q.language || 'English') === config.language &&
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
        if (setShowExportMenu) setShowExportMenu(false);
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
        if (setShowExportMenu) setShowExportMenu(false);

        try {
            // Dual Write: Save to Sheets AND Firestore
            await Promise.all([
                saveQuestionsToSheets(config.sheetUrl, validQuestions),
                Promise.all(validQuestions.map(q => saveQuestionToFirestore(q)))
            ]);

            showMessage(`Export launched! Data synced to Sheets and Firestore.`, 7000);
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
        if (setShowExportMenu) setShowExportMenu(false);

        try {
            const data = await fetchQuestionsFromSheets(config.sheetUrl);
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
            if (setHistoricalQuestions) setHistoricalQuestions(loadedQuestions);

            // Only switch to database view if NOT in review mode
            // Actually, user might want to see it in DB view first.
            // Let's keep behavior but ensure data is available for review.
            setAppMode('database');
            showMessage(`Loaded ${loadedQuestions.length} questions from Database View!`, 3000);
        } catch (e) {
            console.error("Load Error:", e);
            showMessage(`Load Failed: ${e.message}. (Ensure Script Access is set to 'Anyone')`, 7000);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLoadFromFirestore = async () => {
        setIsProcessing(true);
        setStatus("Loading from Firestore...");
        if (setShowExportMenu) setShowExportMenu(false);

        try {
            const data = await getQuestionsFromFirestore();
            // Firestore data is already in the correct format, but we ensure essential fields
            const loadedQuestions = data.map((q, index) => ({
                ...q,
                id: q.id || Date.now() + index + Math.random(), // Ensure React key
                status: 'accepted' // Assume DB questions are accepted
            }));

            setDatabaseQuestions(loadedQuestions);
            if (setHistoricalQuestions) setHistoricalQuestions(loadedQuestions);

            setAppMode('database');
            showMessage(`Loaded ${loadedQuestions.length} questions from Firestore!`, 3000);
        } catch (e) {
            console.error("Firestore Load Error:", e);
            showMessage(`Firestore Load Failed: ${e.message}`, 7000);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkExport = async (exportOptions) => {
        const { format, includeRejected, languages, scope, segmentFiles, limit } = exportOptions;

        let sourceQuestions = [];
        if (scope === 'filtered') {
            const visibleIds = new Set(uniqueFilteredQuestions.map(q => q.uniqueId));
            sourceQuestions = Array.from(allQuestionsMap.values())
                .flatMap(variants => variants.filter(v => visibleIds.has(v.uniqueId)));
        } else {
            sourceQuestions = Array.from(allQuestionsMap.values()).flat();
        }

        let questionsToExport = sourceQuestions.filter(q => {
            const langMatch = languages.includes(q.language || 'English');
            const statusMatch = includeRejected || q.status !== 'rejected';
            return langMatch && statusMatch;
        });

        if (limit && limit > 0) {
            questionsToExport = questionsToExport.slice(0, limit);
        }

        if (questionsToExport.length === 0) {
            showMessage('No questions to export with selected options.', 3000);
            return;
        }

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

    return {
        handleExportByGroup,
        handleExportCurrentTarget,
        handleExportToSheets,
        handleLoadFromSheets,
        handleLoadFromFirestore,
        handleBulkExport
    };
};
