import { useState, useRef } from 'react';
import { processUploadedFile } from '../utils/fileProcessor';
import { generateContent } from '../services/gemini';

export const useFileHandler = (config, setConfig, addQuestionsToState, showMessage, setStatus, isApiReady, effectiveApiKey) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const removeFile = (index) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

    const getFileContext = () => {
        const MAX_FILE_CONTENT_LENGTH = 10000;
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

    const handleFileChange = async (e, showHistory) => {
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
