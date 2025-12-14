import { describe, it, expect } from 'vitest';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './questionFilters';

describe('createFilteredQuestions', () => {
    const mockQuestions = [
        { uniqueId: '1', status: 'pending', creatorName: 'Sam', discipline: 'Tech Art', difficulty: 'Easy', type: 'Multiple Choice', question: 'Q1 Easy MC' },
        { uniqueId: '2', status: 'accepted', creatorName: 'Sam', discipline: 'Tech Art', difficulty: 'Hard', type: 'True/False', question: 'Q2 Hard TF' },
        { uniqueId: '3', status: 'rejected', creatorName: 'Other', discipline: 'VFX', difficulty: 'Easy', type: 'Multiple Choice', question: 'Q3 VFX Easy' },
        { uniqueId: '4', status: 'pending', creatorName: 'Sam', discipline: 'Tech Art', difficulty: 'Easy', type: 'True/False', question: 'Q4 Easy TF' },
    ];

    // Params: questions, historical, showHistory, filterMode, filterByCreator, searchTerm, creatorName, discipline, difficulty, type, language, selectedTags

    it('filters by status (accepted)', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'accepted', false, '', 'Sam', 'Tech Art', null, null, 'English');
        expect(result).toHaveLength(1);
        expect(result[0].uniqueId).toBe('2');
    });

    it('filters by creator', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', true, '', 'Sam', null, null, null, 'English');
        expect(result).toHaveLength(3); // Q1, Q2, Q4 are by Sam
        expect(result.every(q => q.creatorName === 'Sam')).toBe(true);
    });

    it('filters by discipline', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, '', 'Sam', 'VFX', null, null, 'English');
        expect(result).toHaveLength(1);
        expect(result[0].discipline).toBe('VFX');
    });

    it('filters by difficulty', () => {
        // Filter by Easy difficulty in Tech Art (skip type filter)
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, '', 'Sam', 'Tech Art', 'Easy', null, 'English');
        expect(result).toHaveLength(2); // Q1 and Q4 are Easy in Tech Art
        expect(result.every(q => q.difficulty === 'Easy')).toBe(true);
    });

    it('filters by search term', () => {
        // Search for "Hard" - should find Q2
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, 'Hard', 'Sam', null, null, null, 'English');
        expect(result).toHaveLength(1);
        expect(result[0].question).toBe('Q2 Hard TF');
    });

    it('filters by multiple criteria combined', () => {
        // Easy + Tech Art + pending (skip type filter)
        const result = createFilteredQuestions(mockQuestions, [], false, 'pending', false, '', 'Sam', 'Tech Art', 'Easy', null, 'English');
        expect(result).toHaveLength(2); // Q1 and Q4
    });
});

describe('createUniqueFilteredQuestions', () => {
    const variants = [
        { uniqueId: '1', language: 'English', question: 'Hello' },
        { uniqueId: '1', language: 'Spanish', question: 'Hola' },
        { uniqueId: '2', language: 'French', question: 'Bonjour' },
    ];

    it('returns one question per uniqueId', () => {
        const result = createUniqueFilteredQuestions(variants, 'English');
        expect(result).toHaveLength(2);
        const ids = result.map(q => q.uniqueId);
        expect(ids).toContain('1');
        expect(ids).toContain('2');
    });

    it('prefers selected language', () => {
        const result = createUniqueFilteredQuestions(variants, 'Spanish');
        const q1 = result.find(q => q.uniqueId === '1');
        expect(q1.language).toBe('Spanish');
    });

    it('falls back to English if selected language missing', () => {
        const result = createUniqueFilteredQuestions(variants, 'German');
        const q1 = result.find(q => q.uniqueId === '1');
        expect(q1.language).toBe('English');
    });

    it('falls back to first available if English missing', () => {
        const result = createUniqueFilteredQuestions(variants, 'German');
        const q2 = result.find(q => q.uniqueId === '2');
        expect(q2.language).toBe('French');
    });
});
