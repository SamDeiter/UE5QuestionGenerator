/**
 * Integration Tests for Question Generation Flow
 * Tests the complete workflow of generating questions using AI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeneration } from '../hooks/useGeneration';
import * as geminiMock from './mocks/gemini.mock';
import { mockQuestions } from './testHelpers';

// Mock the gemini service
vi.mock('../services/gemini', async () => {
    return await import('./mocks/gemini.mock');
});

// Mock the analytics store
vi.mock('../utils/analyticsStore', () => ({
    logGeneration: vi.fn(() => 'gen-123'),
    logQuestion: vi.fn()
}));

describe('Question Generation Integration Tests', () => {
    let mockConfig;
    let mockSetConfig;
    let mockShowMessage;
    let mockSetStatus;
    let mockSetShowNameModal;
    let mockSetShowAdvancedConfig;
    let mockSetShowApiError;
    let mockSetShowHistory;
    let mockCheckAndStoreQuestions;
    let mockAddQuestionsToState;
    let mockUpdateQuestionInState;
    let mockHandleLanguageSwitch;
    let mockGetFileContext;
    let translationMap;
    let allQuestionsMap;

    beforeEach(() => {
        // Reset mocks
        geminiMock.resetMock();

        // Setup mock config
        mockConfig = {
            creatorName: 'TestUser',
            discipline: 'Graphics',
            difficulty: 'Medium',
            type: 'Multiple Choice',
            language: 'English',
            batchSize: 2,
            temperature: 0.7,
            model: 'gemini-1.5-flash'
        };

        // Setup mock functions
        mockSetConfig = vi.fn();
        mockShowMessage = vi.fn();
        mockSetStatus = vi.fn();
        mockSetShowNameModal = vi.fn();
        mockSetShowAdvancedConfig = vi.fn();
        mockSetShowApiError = vi.fn();
        mockSetShowHistory = vi.fn();
        mockHandleLanguageSwitch = vi.fn();
        mockGetFileContext = vi.fn(() => '');

        mockCheckAndStoreQuestions = vi.fn(async (questions) => {
            // Simulate adding unique IDs and returning questions
            return questions.map(q => ({
                ...q,
                id: Date.now() + Math.random(),
                uniqueId: `uid-${Date.now()}`,
                dateAdded: new Date().toISOString(),
                status: 'pending',
                creatorName: mockConfig.creatorName
            }));
        });

        mockAddQuestionsToState = vi.fn();
        mockUpdateQuestionInState = vi.fn();

        translationMap = new Map();
        allQuestionsMap = new Map();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Single Question Generation', () => {
        it('should generate a question successfully', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true, // isApiReady
                    false, // isTargetMet
                    5, // maxBatchSize
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            expect(result.current.isGenerating).toBe(false);

            // Trigger generation
            await act(async () => {
                await result.current.handleGenerate();
            });

            // Wait for generation to complete
            await waitFor(() => {
                expect(result.current.isGenerating).toBe(false);
            });

            // Verify API was called
            expect(geminiMock.getCallCount()).toBe(1);

            // Verify questions were added to state
            expect(mockAddQuestionsToState).toHaveBeenCalled();
            const addedQuestions = mockAddQuestionsToState.mock.calls[0][0];
            expect(addedQuestions.length).toBeGreaterThan(0);
            expect(addedQuestions[0]).toHaveProperty('question');
            expect(addedQuestions[0]).toHaveProperty('difficulty');
            expect(addedQuestions[0]).toHaveProperty('type');

            // Verify status was updated
            expect(mockSetStatus).toHaveBeenCalledWith('Drafting Scenarios...');
            expect(mockSetStatus).toHaveBeenCalledWith('');
        });

        it('should not generate without creator name', async () => {
            const configWithoutName = { ...mockConfig, creatorName: '' };

            const { result } = renderHook(() =>
                useGeneration(
                    configWithoutName,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleGenerate();
            });

            // Should show error message
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('Creator Name'),
                5000
            );
            expect(mockSetShowNameModal).toHaveBeenCalledWith(true);

            // Should not call API
            expect(geminiMock.getCallCount()).toBe(0);
        });

        it('should not generate without API key', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    '', // No API key
                    false, // isApiReady = false
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleGenerate();
            });

            // Should show error
            expect(mockSetShowApiError).toHaveBeenCalledWith(true);
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('API key'),
                5000
            );

            // Should not call API
            expect(geminiMock.getCallCount()).toBe(0);
        });

        it('should handle API errors gracefully', async () => {
            // Simulate API error
            geminiMock.simulateError('Network timeout');

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleGenerate();
            });

            await waitFor(() => {
                expect(result.current.isGenerating).toBe(false);
            });

            // Should show error message
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('Network timeout'),
                10000
            );

            // Should set error status
            expect(mockSetStatus).toHaveBeenCalledWith('Error');

            // Should not add questions
            expect(mockAddQuestionsToState).not.toHaveBeenCalled();
        });
    });

    describe('Question Variations', () => {
        it('should generate variations of existing question', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleVariate(mockQuestions.multipleChoice);
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Verify API was called
            expect(geminiMock.getCallCount()).toBe(1);
            const lastCall = geminiMock.getLastCall();
            expect(lastCall.userPrompt).toContain(mockQuestions.multipleChoice.question);

            // Verify variations were added
            expect(mockAddQuestionsToState).toHaveBeenCalled();
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('variations'),
                3000
            );
        });

        it('should generate explanation for question', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleExplain(mockQuestions.multipleChoice);
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Verify explanation was added to question
            expect(mockUpdateQuestionInState).toHaveBeenCalledWith(
                mockQuestions.multipleChoice.id,
                expect.any(Function)
            );

            // Verify status was cleared
            expect(mockSetStatus).toHaveBeenCalledWith('');
        });

        it('should generate critique for question', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleCritique(mockQuestions.rejected);
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Verify critique was added
            expect(mockUpdateQuestionInState).toHaveBeenCalled();
            expect(mockShowMessage).toHaveBeenCalledWith('Critique Ready', 3000);
        });
    });

    describe('Token Usage Tracking', () => {
        it('should log token usage for successful generation', async () => {
            const { logGeneration } = await import('../utils/analyticsStore');

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleGenerate();
            });

            await waitFor(() => {
                expect(result.current.isGenerating).toBe(false);
            });

            // Verify analytics were logged
            expect(logGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    discipline: 'Graphics',
                    difficulty: 'Medium',
                    success: true,
                    tokensUsed: expect.objectContaining({
                        input: expect.any(Number),
                        output: expect.any(Number)
                    })
                })
            );
        });

        it('should log failed generation attempts', async () => {
            const { logGeneration } = await import('../utils/analyticsStore');
            geminiMock.simulateError('API Error');

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    mockSetConfig,
                    'test-api-key',
                    true,
                    false,
                    5,
                    mockGetFileContext,
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    mockSetShowNameModal,
                    mockSetShowAdvancedConfig,
                    mockSetShowApiError,
                    mockSetShowHistory,
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleGenerate();
            });

            await waitFor(() => {
                expect(result.current.isGenerating).toBe(false);
            });

            // Verify failed generation was logged
            expect(logGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorMessage: 'API Error',
                    questionsGenerated: 0
                })
            );
        });
    });
});
