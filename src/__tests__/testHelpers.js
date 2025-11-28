/**
 * Test Helpers and Mock Data for Integration Tests
 * Provides reusable utilities, mock data, and helper functions for testing
 */

import { render } from '@testing-library/react';
import { vi } from 'vitest';

// ============================================================================
// MOCK QUESTION DATA
// ============================================================================

export const mockQuestions = {
    multipleChoice: {
        id: 'mc-001',
        uniqueId: 'uid-mc-001',
        question: 'What is the primary rendering pipeline in Unreal Engine 5?',
        difficulty: 'Medium',
        type: 'Multiple Choice',
        options: {
            A: 'Forward Rendering',
            B: 'Deferred Rendering',
            C: 'Nanite',
            D: 'Lumen'
        },
        correct: 'B',
        status: 'pending',
        creatorName: 'TestUser',
        language: 'English',
        discipline: 'Graphics',
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString()
    },

    trueFalse: {
        id: 'tf-001',
        uniqueId: 'uid-tf-001',
        question: 'Blueprints in Unreal Engine are compiled to C++ code.',
        difficulty: 'Easy',
        type: 'True/False',
        options: { A: 'True', B: 'False' },
        correct: 'B',
        status: 'accepted',
        creatorName: 'TestUser',
        language: 'English',
        discipline: 'Blueprints',
        timestamp: new Date('2024-01-15T11:00:00Z').toISOString()
    },

    fillInBlank: {
        id: 'fib-001',
        uniqueId: 'uid-fib-001',
        question: 'The _____ system in UE5 provides real-time global illumination.',
        difficulty: 'Medium',
        type: 'Fill in the Blank',
        options: {},
        correct: 'Lumen',
        status: 'pending',
        creatorName: 'TestUser',
        language: 'English',
        discipline: 'Graphics',
        timestamp: new Date('2024-01-15T12:00:00Z').toISOString()
    },

    translated: {
        id: 'mc-002',
        uniqueId: 'uid-mc-001', // Same uniqueId as multipleChoice (translation)
        question: '虚幻引擎5中的主要渲染管线是什么？',
        difficulty: 'Medium',
        type: 'Multiple Choice',
        options: {
            A: '前向渲染',
            B: '延迟渲染',
            C: 'Nanite',
            D: 'Lumen'
        },
        correct: 'B',
        status: 'pending',
        creatorName: 'TestUser',
        language: 'Chinese',
        discipline: 'Graphics',
        timestamp: new Date('2024-01-15T13:00:00Z').toISOString()
    },

    rejected: {
        id: 'mc-003',
        uniqueId: 'uid-mc-003',
        question: 'What is a bad question?',
        difficulty: 'Easy',
        type: 'Multiple Choice',
        options: { A: 'This', B: 'That', C: 'Other', D: 'None' },
        correct: 'A',
        status: 'rejected',
        creatorName: 'TestUser',
        language: 'English',
        discipline: 'General',
        timestamp: new Date('2024-01-15T14:00:00Z').toISOString()
    }
};

// ============================================================================
// MOCK API RESPONSES
// ============================================================================

export const mockGeminiResponses = {
    singleQuestion: {
        text: () => `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Graphics | Multiple Choice | Medium | What is the primary rendering pipeline in Unreal Engine 5? | | Forward Rendering | Deferred Rendering | Nanite | Lumen | B | https://docs.unrealengine.com | Source |`
    },

    batchQuestions: {
        text: () => `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | General | Multiple Choice | Easy | What does UE5 stand for? | | Unreal Engine 5 | Unity Engine 5 | Unreal Editor 5 | Universal Engine 5 | A | https://docs.unrealengine.com | Source |
| 2 | Graphics | True/False | Medium | Lumen provides real-time global illumination. | | True | False | | | A | https://docs.unrealengine.com | Source |`
    },

    translation: {
        text: () => `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Graphics | Multiple Choice | Medium | 虚幻引擎5中的主要渲染管线是什么？ | | 前向渲染 | 延迟渲染 | Nanite | Lumen | B | https://docs.unrealengine.com | Source |`
    },

    explanation: {
        text: () => `Deferred Rendering is the primary pipeline in UE5 because it allows for efficient handling of multiple lights and complex materials. The G-Buffer stores geometric information that can be processed in screen space.`
    },

    critique: {
        text: () => `**Score: 8/10**

**Strengths:**
- Clear and specific question
- Good difficulty level
- Relevant to UE5

**Improvements:**
- Could specify "default" rendering pipeline
- Option C and D are not rendering pipelines`
    }
};

export const mockCSVData = {
    simple: `Question,Difficulty,Type,Options,Correct,Discipline,Language
"What is UE5?",Easy,Multiple Choice,"A: Game Engine|B: Car|C: Food|D: Planet",A,General,English
"Lumen is a lighting system.",Medium,True/False,"A: True|B: False",A,Graphics,English`,

    withTranslations: `Question,Difficulty,Type,Options,Correct,Discipline,Language,UniqueId
"What is UE5?",Easy,Multiple Choice,"A: Game Engine|B: Car|C: Food|D: Planet",A,General,English,uid-001
"什么是UE5？",Easy,Multiple Choice,"A: 游戏引擎|B: 汽车|C: 食物|D: 星球",A,General,Chinese,uid-001`,

    invalid: `This is not a valid CSV file
It has no proper structure
Just random text`
};

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

export const createMockLocalStorage = () => {
    let store = {};

    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        }),
        // Helper to get the store for assertions
        _getStore: () => store,
        _setStore: (newStore) => { store = newStore; }
    };
};

export const createMockFile = (content, filename = 'test.csv', type = 'text/csv') => {
    const blob = new Blob([content], { type });
    blob.name = filename;
    return blob;
};

export const createMockFileReader = (result) => {
    return class MockFileReader {
        readAsText() {
            setTimeout(() => {
                this.result = result;
                if (this.onload) this.onload({ target: this });
            }, 0);
        }
    };
};

// ============================================================================
// RENDER HELPERS
// ============================================================================

/**
 * Render component with common test setup
 */
export const renderWithSetup = (ui, options = {}) => {
    const mockLocalStorage = createMockLocalStorage();
    global.localStorage = mockLocalStorage;

    return {
        ...render(ui, options),
        mockLocalStorage
    };
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if a question object has all required fields
 */
export const isValidQuestion = (question) => {
    const requiredFields = ['id', 'question', 'difficulty', 'type', 'correct', 'status'];
    return requiredFields.every(field => question.hasOwnProperty(field));
};

/**
 * Check if two questions are translations of each other
 */
export const areTranslations = (q1, q2) => {
    return q1.uniqueId === q2.uniqueId && q1.language !== q2.language;
};

/**
 * Get all questions from a specific language
 */
export const filterByLanguage = (questions, language) => {
    return questions.filter(q => q.language === language);
};

/**
 * Get all questions with a specific status
 */
export const filterByStatus = (questions, status) => {
    return questions.filter(q => q.status === status);
};

// ============================================================================
// MOCK EVENT HELPERS
// ============================================================================

/**
 * Create a mock file input change event
 */
export const createFileChangeEvent = (file) => {
    return {
        target: {
            files: [file]
        }
    };
};

/**
 * Create a mock keyboard event
 */
export const createKeyboardEvent = (key, ctrlKey = false) => {
    return new KeyboardEvent('keydown', {
        key,
        ctrlKey,
        bubbles: true
    });
};
