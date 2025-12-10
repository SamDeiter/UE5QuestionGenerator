/**
 * Integration Tests for Feedback Loop (Rejected Questions)
 * Tests that rejected questions are fed back into the AI Prompt.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeneration } from '../hooks/useGeneration';
import * as geminiMock from './mocks/gemini.mock';

// Mock the gemini service
vi.mock('../services/gemini', async () => {
    return await import('./mocks/gemini.mock');
});

// Mock the analytics store
vi.mock('../utils/analyticsStore', () => ({
    logGeneration: vi.fn(),
    logQuestion: vi.fn()
}));

describe('Feedback Loop Integration Tests', () => {
    let mockConfig;
    const mockSetConfig = vi.fn();
    const mockShowMessage = vi.fn();
    const mockSetStatus = vi.fn();
    const mockHandlers = {
        mockSetShowNameModal: vi.fn(),
        mockSetShowAdvancedConfig: vi.fn(), // Kept in handlers obj but not passed
        mockSetShowApiError: vi.fn(),
        mockSetShowHistory: vi.fn(),
        mockCheckAndStoreQuestions: vi.fn(async (q) => q),
        mockAddQuestionsToState: vi.fn(),
        mockUpdateQuestionInState: vi.fn(),
        mockHandleLanguageSwitch: vi.fn(),
        mockGetFileContext: vi.fn(() => '')
    };
    const translationMap = new Map();
    let allQuestionsMap = new Map();

    beforeEach(() => {
        geminiMock.resetMock();
        mockConfig = {
            creatorName: 'TestUser',
            discipline: 'Technical Art', // Must match rejected question discipline
            difficulty: 'Medium',
            type: 'Multiple Choice',
            language: 'English',
            batchSize: 2,
            temperature: 0.7,
            model: 'gemini-1.5-flash'
        };
        allQuestionsMap = new Map();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should include rejected questions in the system prompt', async () => {
        // 1. Seed a rejected question
        const rejectedQuestion = {
            id: 'rejected-1',
            uniqueId: 'rejected-1',
            question: "What is the capital of Mars?",
            rejectionReason: 'hallucination', // Uses our specific label
            critique: "Mars has no capital city.", // Context
            status: 'rejected',
            discipline: 'Technical Art' // Must match config
        };

        allQuestionsMap.set('rejected-1', [rejectedQuestion]);

        const { result } = renderHook(() =>
            useGeneration(
                mockConfig,
                mockSetConfig,
                'test-api-key',
                true,
                false,
                5,
                mockHandlers.mockGetFileContext,
                mockHandlers.mockCheckAndStoreQuestions,
                mockHandlers.mockAddQuestionsToState,
                mockHandlers.mockUpdateQuestionInState,
                mockHandlers.mockHandleLanguageSwitch,
                mockShowMessage,
                mockSetStatus,
                mockHandlers.mockSetShowNameModal,
                // Removed mockSetShowAdvancedConfig here
                mockHandlers.mockSetShowApiError,
                mockHandlers.mockSetShowHistory,
                translationMap,
                allQuestionsMap
            )
        );

        // 2. Trigger Generation
        await act(async () => {
            await result.current.handleGenerate();
        });

        // 3. Verify Prompt Content
        const lastCall = geminiMock.getLastCall();
        expect(lastCall.systemPrompt).toContain('CRITICAL: FAILURE AVOIDANCE');
        expect(lastCall.systemPrompt).toContain('What is the capital of Mars?');
        expect(lastCall.systemPrompt).toContain('Hallucination - completely made up'); // From label map
        expect(lastCall.systemPrompt).toContain('Mars has no capital city.'); // From context
    });

    it('should NOT include rejected questions from other disciplines', async () => {
        // 1. Seed a rejected question from 'Programming'
        const rejectedQuestion = {
            id: 'rejected-other',
            question: "Bad C++ question",
            rejectionReason: 'incorrect',
            status: 'rejected',
            discipline: 'Programming' // Different from config.discipline
        };
        allQuestionsMap.set('rejected-other', [rejectedQuestion]);

        const { result } = renderHook(() =>
            useGeneration(
                mockConfig,
                mockSetConfig,
                'test-api-key',
                true,
                false,
                5,
                mockHandlers.mockGetFileContext,
                mockHandlers.mockCheckAndStoreQuestions,
                mockHandlers.mockAddQuestionsToState,
                mockHandlers.mockUpdateQuestionInState,
                mockHandlers.mockHandleLanguageSwitch,
                mockShowMessage,
                mockSetStatus,
                mockHandlers.mockSetShowNameModal,
                // Removed mockSetShowAdvancedConfig here
                mockHandlers.mockSetShowApiError,
                mockHandlers.mockSetShowHistory,
                translationMap,
                allQuestionsMap
            )
        );

        await act(async () => {
            await result.current.handleGenerate();
        });

        // 3. Verify Prompt Content
        const lastCall = geminiMock.getLastCall();
        expect(lastCall.systemPrompt).not.toContain('CRITICAL: FAILURE AVOIDANCE');
        expect(lastCall.systemPrompt).not.toContain('Bad C++ question');
    });
});
