// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
    chunkArray,
    formatUrl,
    stripHtmlTags,
    formatDate,
    parseCSVLine,
    filterDuplicateQuestions
} from './helpers';

describe('Helper Functions', () => {

    describe('chunkArray', () => {
        it('should split array into chunks of given size', () => {
            const input = [1, 2, 3, 4, 5];
            const result = chunkArray(input, 2);
            expect(result).toEqual([[1, 2], [3, 4], [5]]);
        });

        it('should handle empty array', () => {
            expect(chunkArray([], 3)).toEqual([]);
        });

        it('should handle size larger than array', () => {
            expect(chunkArray([1, 2], 5)).toEqual([[1, 2]]);
        });
    });

    describe('formatUrl', () => {
        it('should add https:// if missing', () => {
            expect(formatUrl('google.com')).toBe('https://google.com');
        });

        it('should not change valid https:// url', () => {
            expect(formatUrl('https://example.com')).toBe('https://example.com');
        });

        it('should return empty string for null/undefined', () => {
            expect(formatUrl(null)).toBe('');
        });
    });

    describe('stripHtmlTags', () => {
        it('should remove HTML tags', () => {
            expect(stripHtmlTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
        });

        it('should handle plain text', () => {
            expect(stripHtmlTags('Just text')).toBe('Just text');
        });
    });

    describe('formatDate', () => {
        it('should format date as YYYY-MM-DD', () => {
            const date = new Date('2023-12-25T12:00:00Z');
            // Adjust for local time zone differences in test environment if needed
            // For simplicity, we check the structure or specific parts
            const formatted = formatDate(date);
            expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('parseCSVLine', () => {
        it('should parse simple CSV line', () => {
            expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
        });

        it('should handle quoted values with commas', () => {
            expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
        });

        it('should handle quoted quotes', () => {
            expect(parseCSVLine('a,"b""c",d')).toEqual(['a', 'b"c', 'd']);
        });
    });

    describe('filterDuplicateQuestions', () => {
        it('should filter out duplicates based on ID', () => {
            const current = [{ id: 1, question: 'Q1' }];
            const newItems = [{ id: 1, question: 'Q1' }, { id: 2, question: 'Q2' }];
            const result = filterDuplicateQuestions(newItems, current);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(2);
        });

        it('should filter out duplicates based on text content', () => {
            const current = [{ id: 1, question: 'Hello World' }];
            const newItems = [{ id: 99, question: 'hello world' }, { id: 2, question: 'New Q' }];
            const result = filterDuplicateQuestions(newItems, current);
            expect(result).toHaveLength(1);
            expect(result[0].question).toBe('New Q');
        });
    });
});
