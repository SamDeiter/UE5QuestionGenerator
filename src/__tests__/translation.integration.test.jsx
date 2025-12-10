/**
 * Integration Tests for Translation Workflow
 * Tests single translation, bulk translation, and language switching
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

// Mock analytics
vi.mock('../utils/analyticsStore', () => ({
    logGeneration: vi.fn(() => 'gen-123'),
    logQuestion: vi.fn()
}));

describe('Translation Integration Tests', () => {
    let mockConfig;
    let mockShowMessage;
    let mockSetStatus;
    let mockCheckAndStoreQuestions;
    let mockAddQuestionsToState;
    let mockUpdateQuestionInState;
    let mockHandleLanguageSwitch;
    let translationMap;
    let allQuestionsMap;

    beforeEach(() => {
        geminiMock.resetMock();

        mockConfig = {
            creatorName: 'TestUser',
            discipline: 'Graphics',
            difficulty: 'Medium',
            type: 'Multiple Choice',
            language: 'English',
            batchSize: 2
        };

        mockShowMessage = vi.fn();
        mockSetStatus = vi.fn();
        mockHandleLanguageSwitch = vi.fn();

        mockCheckAndStoreQuestions = vi.fn(async (questions) => {
            return questions.map(q => ({
                ...q,
                id: Date.now() + Math.random(),
                dateAdded: new Date().toISOString()
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

    describe('Single Question Translation', () => {
        it('should translate a question to target language', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleTranslateSingle(
                    mockQuestions.multipleChoice,
                    'Chinese (Simplified)'
                );
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Verify API was called with translation prompt
            expect(geminiMock.getCallCount()).toBe(1);
            const lastCall = geminiMock.getLastCall();
            expect(lastCall.userPrompt).toContain('Translate');
            expect(lastCall.userPrompt).toContain('Chinese (Simplified)');

            // Verify translated question was added
            expect(mockAddQuestionsToState).toHaveBeenCalled();
            const translatedQuestion = mockAddQuestionsToState.mock.calls[0][0][0];
            expect(translatedQuestion.language).toBe('Chinese (Simplified)');
            expect(translatedQuestion.uniqueId).toBe(mockQuestions.multipleChoice.uniqueId);
            expect(translatedQuestion.status).toBe('accepted');

            // Verify language was switched
            expect(mockHandleLanguageSwitch).toHaveBeenCalledWith('Chinese (Simplified)');

            // Verify success message
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('Translated'),
                3000
            );
        });

        it('should preserve question metadata during translation', async () => {
            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleTranslateSingle(
                    mockQuestions.multipleChoice,
                    'Japanese'
                );
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            const translatedQuestion = mockAddQuestionsToState.mock.calls[0][0][0];
            expect(translatedQuestion.discipline).toBe(mockQuestions.multipleChoice.discipline);
            expect(translatedQuestion.type).toBe(mockQuestions.multipleChoice.type);
            expect(translatedQuestion.difficulty).toBe(mockQuestions.multipleChoice.difficulty);
        });

        it('should handle translation errors gracefully', async () => {
            geminiMock.simulateError('Translation failed');

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleTranslateSingle(
                    mockQuestions.multipleChoice,
                    'Korean'
                );
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            expect(mockSetStatus).toHaveBeenCalledWith('Translation Failed');
            expect(mockAddQuestionsToState).not.toHaveBeenCalled();
        });
    });

    describe('Bulk Translation', () => {
        it('should translate multiple questions to target languages', async () => {
            // Setup questions map with accepted questions
            const baseQuestion = {
                ...mockQuestions.multipleChoice,
                status: 'accepted'
            };

            allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleBulkTranslateMissing();
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            }, { timeout: 5000 });

            // Should translate to CN, JP, KR (3 languages)
            expect(geminiMock.getCallCount()).toBe(3);

            // Should add all translations
            expect(mockAddQuestionsToState).toHaveBeenCalledTimes(3);

            // Verify success message
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('complete'),
                7000
            );
        });

        it('should skip already translated questions', async () => {
            const baseQuestion = {
                ...mockQuestions.multipleChoice,
                status: 'accepted'
            };

            // Mark Chinese as already translated
            translationMap.set(baseQuestion.uniqueId, new Set(['Chinese (Simplified)']));
            allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleBulkTranslateMissing();
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            }, { timeout: 5000 });

            // Should only translate JP and KR (2 languages)
            expect(geminiMock.getCallCount()).toBe(2);
        });

        it('should show progress during bulk translation', async () => {
            const baseQuestion = {
                ...mockQuestions.multipleChoice,
                status: 'accepted'
            };

            allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleBulkTranslateMissing();
            });

            await waitFor(() => {
                expect(result.current.translationProgress).toBeGreaterThan(0);
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            }, { timeout: 5000 });
        });

        it('should not translate rejected questions', async () => {
            allQuestionsMap.set(mockQuestions.rejected.uniqueId, [mockQuestions.rejected]);

            const { result } = renderHook(() =>
                useGeneration(
                    mockConfig,
                    vi.fn(),
                    'test-api-key',
                    true,
                    false,
                    5,
                    vi.fn(() => ''),
                    mockCheckAndStoreQuestions,
                    mockAddQuestionsToState,
                    mockUpdateQuestionInState,
                    mockHandleLanguageSwitch,
                    mockShowMessage,
                    mockSetStatus,
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    vi.fn(),
                    translationMap,
                    allQuestionsMap
                )
            );

            await act(async () => {
                await result.current.handleBulkTranslateMissing();
            });

            await waitFor(() => {
                expect(result.current.isProcessing).toBe(false);
            });

            // Should show message that no translations are needed
            expect(mockShowMessage).toHaveBeenCalledWith(
                expect.stringContaining('already exist'),
                5000
            );

            // Should not call API
            expect(geminiMock.getCallCount()).toBe(0);
        });
    });
});
