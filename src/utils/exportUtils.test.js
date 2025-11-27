import { describe, it, expect } from 'vitest';
import { getCSVContent, segmentQuestions } from './exportUtils';

describe('exportUtils', () => {
    describe('getCSVContent', () => {
        const mockQuestions = [
            {
                uniqueId: 'u1',
                discipline: 'Tech Art',
                type: 'Multiple Choice',
                difficulty: 'Easy',
                question: 'Q1',
                options: { A: 'OptA', B: 'OptB', C: 'OptC', D: 'OptD' },
                correct: 'A',
                sourceUrl: 'http://example.com',
                sourceExcerpt: 'Excerpt',
                language: 'English'
            }
        ];

        it('generates correct CSV header', () => {
            const csv = getCSVContent([], 'Creator', 'Reviewer');
            const header = csv.split('\n')[0];
            expect(header).toContain('ID');
            expect(header).toContain('Question ID');
            expect(header).toContain('Discipline');
            expect(header).toContain('Creator');
        });

        it('formats question data correctly', () => {
            const csv = getCSVContent(mockQuestions, 'Sam', 'Rev');
            const lines = csv.split('\n');
            const dataRow = lines[1];

            expect(dataRow).toContain('u1');
            expect(dataRow).toContain('Tech Art');
            expect(dataRow).toContain('Easy');
            expect(dataRow).toContain('Q1');
            expect(dataRow).toContain('OptA');
            expect(dataRow).toContain('Sam');
            expect(dataRow).toContain('Rev');
        });

        it('handles missing optional fields', () => {
            const incompleteQ = [{ ...mockQuestions[0], options: { A: 'A', B: 'B' }, sourceUrl: null }];
            const csv = getCSVContent(incompleteQ, 'Sam', 'Rev');
            const dataRow = csv.split('\n')[1];
            console.log('DEBUG CSV ROW:', dataRow);

            // Should handle missing C/D options gracefully (empty strings between delimiters)
            // Note: Exact check depends on delimiter, but we expect no "undefined" or "null" strings
            // Expect empty strings for missing fields
            expect(dataRow).toContain('""');
            expect(dataRow).not.toMatch(/undefined/);
            expect(dataRow).not.toMatch(/null/);
        });
    });

    describe('segmentQuestions', () => {
        const questions = [
            { language: 'English', discipline: 'Art', difficulty: 'Easy', type: 'Multiple Choice' },
            { language: 'English', discipline: 'Art', difficulty: 'Easy', type: 'Multiple Choice' },
            { language: 'Spanish', discipline: 'Code', difficulty: 'Hard', type: 'True/False' },
        ];

        it('groups questions by unique combination of attributes', () => {
            const segmented = segmentQuestions(questions);
            const keys = Object.keys(segmented);

            expect(keys).toHaveLength(2);
            expect(keys).toContain('English_Art_Easy_MC');
            expect(keys).toContain('Spanish_Code_Hard_T/F');
        });

        it('places correct questions in groups', () => {
            const segmented = segmentQuestions(questions);
            expect(segmented['English_Art_Easy_MC']).toHaveLength(2);
            expect(segmented['Spanish_Code_Hard_T/F']).toHaveLength(1);
        });
    });
});
