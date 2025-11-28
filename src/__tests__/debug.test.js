
import { describe, it } from 'vitest';
import { parseCSVQuestions } from '../utils/fileProcessor';

describe('Debug CSV', () => {
    it('should parse csv', () => {
        const csvContent = `ID,UniqueId,Discipline,Type,Difficulty,Question,OptionA,OptionB,OptionC,OptionD,CorrectLetter,DateAdded,SourceURL,SourceExcerpt,CreatorName,ReviewerName,Language
1,uid-001,Graphics,Multiple Choice,Easy,What is UE5?,Game Engine,Car,Food,Planet,A,2024-01-01,,,TestUser,,English`;

        console.log("Content:", csvContent);
        const result = parseCSVQuestions(csvContent, 'test.csv', 'TestUser');
        console.log("Result:", JSON.stringify(result, null, 2));
    });
});
