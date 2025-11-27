import { describe, it, expect } from 'vitest';
import { chunkArray, formatUrl, parseCSVLine, filterDuplicateQuestions } from './helpers';

describe('Helper Functions', () => {

    describe('chunkArray', () => {
        it('should split array into chunks of given size', () => {
            const input = [1, 2, 3, 4, 5];
            const result = chunkArray(input, 2);
            expect(result).toEqual([[1, 2], [3, 4], [5]]);
        });

        it('should return empty array for empty input', () => {
            expect(chunkArray([], 3)).toEqual([]);
        });
    });

    describe('formatUrl', () => {
        it('should add https:// if missing', () => {
            expect(formatUrl('google.com')).toBe('https://google.com');
        });

        it('should not change valid https url', () => {
            expect(formatUrl('https://example.com')).toBe('https://example.com');
        });

        it('should return empty string for null/undefined', () => {
            expect(formatUrl(null)).toBe('');
        });
    });

    describe('parseCSVLine', () => {
        it('should parse simple comma separated values', () => {
            expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
        });

        it('should handle quoted values containing commas', () => {
            expect(parseCSVLine('"a,b",c')).toEqual(['a,b', 'c']);
        });
    });

    describe('filterDuplicateQuestions', () => {
        it('should filter out questions with existing IDs', () => {
            const current = [{ id: 1, question: 'Q1' }];
            const newItems = [{ id: 1, question: 'Q1 New' }, { id: 2, question: 'Q2' }];

            const result = filterDuplicateQuestions(newItems, current);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(2);
        });

        it('should filter out questions with same text (case-insensitive)', () => {
            const current = [{ id: 1, question: 'What is UE5?' }];
            const newItems = [{ id: 2, question: 'what is ue5?' }, { id: 3, question: 'New Q' }];

            const result = filterDuplicateQuestions(newItems, current);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(3);
        });

        it('should check against other list as well', () => {
            const current = [];
            const other = [{ id: 1, question: 'Q1' }];
            const newItems = [{ id: 1, question: 'Q1' }];

            const result = filterDuplicateQuestions(newItems, current, other);
            expect(result).toHaveLength(0);
        });
    });
});
