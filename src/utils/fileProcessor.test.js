import { describe, it, expect, vi } from 'vitest';
import { detectLanguageFromFilename, parseCSVQuestions } from './fileProcessor';

// Mock helper functions used by fileProcessor
vi.mock('./stringHelpers', () => ({
    parseCSVLine: (line) => line.split(','), // Simple mock splitter
    FIELD_DELIMITER: ','
}));

vi.mock('./constants', () => ({
    FIELD_DELIMITER: ',',
    LANGUAGE_FLAGS: { 'English': '🇺🇸', 'Chinese (Simplified)': '🇨🇳' },
    LANGUAGE_CODES: { 'English': 'EN', 'Chinese (Simplified)': 'CN' }
}));

describe('fileProcessor', () => {
    describe('detectLanguageFromFilename', () => {
        it('detects language from full name', () => {
            expect(detectLanguageFromFilename('questions_Chinese_(Simplified).csv')).toBe('Chinese (Simplified)');
        });

        // it('detects language from code', () => {
        //     expect(detectLanguageFromFilename('test_CN_.csv')).toBe('Chinese (Simplified)');
        // });

        it('returns null for unknown language', () => {
            expect(detectLanguageFromFilename('questions_unknown.csv')).toBeNull();
        });
    });

    describe('parseCSVQuestions', () => {
        const v17Header = "ID,Unique ID,Status,Discipline,Difficulty,Type,Question,Option A,Option B,Option C,Option D,Answer,Explanation,Language,Source URL,Date";
        const v16Header = "ID,Unique ID,Discipline,Type,Difficulty,Question,Option A,Option B,Option C,Option D,Answer,Date,Source URL,Source Excerpt,Creator,Reviewer,Language";

        it('parses v1.7 format correctly', () => {
            const row = "1,uid123,accepted,Art,Easy,Multiple Choice,Q1,A,B,C,D,A,Exp,English,http://url,2023-01-01";
            const content = `${v17Header}\n${row}`;

            const result = parseCSVQuestions(content, 'test.csv', 'DefaultCreator');

            expect(result).toHaveLength(1);
            expect(result[0].uniqueId).toBe('uid123');
            expect(result[0].discipline).toBe('Art');
            expect(result[0].question).toBe('Q1');
            expect(result[0].explanation).toBe('Exp');
        });

        it('parses v1.6 format correctly', () => {
            const row = "1,uid456,Code,Multiple Choice,Hard,Q2,A,B,C,D,B,2023-01-01,http://url,Excerpt,Creator,Rev,Spanish";
            const content = `${v16Header}\n${row}`;

            const result = parseCSVQuestions(content, 'test.csv', 'DefaultCreator');

            expect(result).toHaveLength(1);
            expect(result[0].uniqueId).toBe('uid456');
            expect(result[0].discipline).toBe('Code');
            expect(result[0].language).toBe('Spanish');
        });

        it('returns empty array for invalid header', () => {
            const content = "Invalid,Header,Row\n1,2,3";
            const result = parseCSVQuestions(content, 'test.csv', 'DefaultCreator');
            expect(result).toEqual([]);
        });

        it('detects language from filename if missing in row (v1.7)', () => {
            // Row with empty language field (index 13)
            const row = "1,uid123,accepted,Art,Easy,Multiple Choice,Q1,A,B,C,D,A,Exp,,http://url,2023-01-01";
            const content = `${v17Header}\n${row}`;

            const result = parseCSVQuestions(content, 'questions_Chinese_(Simplified).csv', 'DefaultCreator');

            expect(result[0].language).toBe('Chinese (Simplified)');
        });
    });
});
