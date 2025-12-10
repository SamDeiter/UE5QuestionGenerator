import { useState, useRef } from 'react';
import { processUploadedFile } from '../utils/fileProcessor';
import { generateContent } from '../services/gemini';
import { optimizeContext, processMultipleFiles, analyzeOptimization } from '../utils/contextOptimizer';

export const useFileHandler = (config, setConfig, addQuestionsToState, showMessage, setStatus, isApiReady, effectiveApiKey) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const removeFile = (index) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

    const getFileContext = () => {
        if (files.length === 0) return "";

        // Use context optimizer for smart file processing
        const optimizedContext = processMultipleFiles(
            files.map(f => ({ name: f.name, content: f.content })),
            config.discipline
        );

        // Log optimization results
        const originalContext = files.map(f => `## ${f.name}\n${f.content}`).join('\n\n');
        const analysis = analyzeOptimization(originalContext, optimizedContext);

        if (analysis.reduction.percentage > 0) {
            // Optimization info available
        }

        return "\n\n### ATTACHED LOCAL SOURCE FILES:\n" + optimizedContext;
    };

    const handleFileChange = async (e, showHistory) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        let importedCount = 0;
        let referenceCount = 0;
        const errors = [];

        for (const file of newFiles) {
            const result = await processUploadedFile(file, config.creatorName);

            if (result.error) {
                errors.push(`${file.name}: ${result.error}`);
                continue;
            }

            if (result.type === 'questions') {
                addQuestionsToState(result.data, showHistory);
                importedCount += result.data.length;

            } else if (result.type === 'reference') {
                setFiles(prev => [...prev, result.data]);
                referenceCount++;
            }
        }

        if (importedCount > 0) showMessage(`Successfully imported ${importedCount} questions.`, 4000);
        if (referenceCount > 0) showMessage(`Added ${referenceCount} reference files.`, 3000);
        if (errors.length > 0) {
            console.error("File processing errors:", errors);
            showMessage(`Some files failed: ${errors.slice(0, 2).join(', ')}`, 6000);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
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

    return {
        files, setFiles,
        fileInputRef,
        isDetecting,
        handleFileChange,
        removeFile,
        getFileContext,
        handleDetectTopics
    };
};
