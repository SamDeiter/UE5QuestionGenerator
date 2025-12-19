
import { parseCSVQuestions } from './src/utils/fileProcessor.js';

const csvContent = `ID,UniqueId,Discipline,Type,Difficulty,Question,OptionA,OptionB,OptionC,OptionD,CorrectLetter,DateAdded,SourceURL,SourceExcerpt,CreatorName,ReviewerName,Language
1,uid-001,Graphics,Multiple Choice,Easy,What is UE5?,Game Engine,Car,Food,Planet,A,2024-01-01,,,TestUser,,English`;

console.log("Content:", csvContent);

try {
    const result = parseCSVQuestions(csvContent, 'test.csv', 'TestUser');
    console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
    console.error("Error:", e);
}
