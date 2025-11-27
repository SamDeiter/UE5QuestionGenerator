import { describe, it, expect } from 'vitest';
import { createFilteredQuestions, createUniqueFilteredQuestions } from './questionFilters';

describe('createFilteredQuestions', () => {
    const mockQuestions = [
        { uniqueId: '1', status: 'pending', creatorName: 'Sam', discipline: 'Tech Art', difficulty: 'Easy', type: 'Multiple Choice', question: 'Q1' },
        { uniqueId: '2', status: 'accepted', creatorName: 'Sam', discipline: 'Tech Art', difficulty: 'Hard', type: 'True/False', question: 'Q2' },
        { uniqueId: '3', status: 'rejected', creatorName: 'Other', discipline: 'VFX', difficulty: 'Easy', type: 'Multiple Choice', question: 'Q3' },
    ];

    it('filters by status', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'accepted', false, '', 'Sam', 'Tech Art', 'Balanced All', 'English');
        expect(result).toHaveLength(1);
        expect(result[0].uniqueId).toBe('2');
    });

    it('filters by creator', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', true, '', 'Sam', 'Tech Art', 'Balanced All', 'English');
        expect(result).toHaveLength(2);
        expect(result.every(q => q.creatorName === 'Sam')).toBe(true);
    });

    it('filters by discipline', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, '', 'Sam', 'VFX', 'Balanced All', 'English');
        expect(result).toHaveLength(1);
        expect(result[0].discipline).toBe('VFX');
    });

    it('filters by difficulty and type', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, '', 'Sam', 'Tech Art', 'Easy MC', 'English');
        expect(result).toHaveLength(1);
        expect(result[0].uniqueId).toBe('1');
    });

    it('filters by search term', () => {
        const result = createFilteredQuestions(mockQuestions, [], false, 'all', false, 'Q2', 'Sam', 'Tech Art', 'Balanced All', 'English');
        expect(result).toHaveLength(1);
        expect(result[0].question).toBe('Q2');
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
        const result = createUniqueFilteredQuestions(variants, 'German'); // German not in list
        const q1 = result.find(q => q.uniqueId === '1');
        expect(q1.language).toBe('English');
    });

    it('falls back to first available if English missing', () => {
        const result = createUniqueFilteredQuestions(variants, 'German');
        const q2 = result.find(q => q.uniqueId === '2'); // Only French available
        expect(q2.language).toBe('French');
    });
});
