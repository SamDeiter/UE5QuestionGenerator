/**
 * Answer Validator - Validates that the correct answer matches the source excerpt
 * Checks if key terms from the correct answer appear in the SourceExcerpt
 */

/**
 * Extract key terms from text (removes common words)
 * @param {string} text - Text to extract terms from
 * @returns {string[]} Array of key terms
 */
function extractKeyTerms(text) {
    if (!text) return [];

    // Common words to ignore
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
        'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'between', 'under', 'again', 'further', 'then', 'once', 'here',
        'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
        'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'because',
        'until', 'while', 'although', 'this', 'that', 'these', 'those',
        'used', 'use', 'using', 'uses', 'which', 'what', 'it', 'its'
    ]);

    // Extract words, normalize, filter
    const words = text
        .toLowerCase()
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)]; // Remove duplicates
}

/**
 * Validates that the correct answer matches the source excerpt
 * @param {Object} question - Question object
 * @returns {{ isValid: boolean, confidence: number, warning: string | null, details: Object }}
 */
export function validateAnswer(question) {
    // Get the correct answer based on CorrectLetter
    const correctLetter = question.CorrectLetter || question.correctLetter;
    const sourceExcerpt = question.SourceExcerpt || question.sourceExcerpt;

    if (!correctLetter || !sourceExcerpt) {
        return {
            isValid: false,
            confidence: 0,
            warning: 'Missing CorrectLetter or SourceExcerpt',
            details: { correctLetter, hasExcerpt: !!sourceExcerpt }
        };
    }

    // Get the correct answer text
    const letterToOption = {
        'A': question.OptionA || question.optionA,
        'B': question.OptionB || question.optionB,
        'C': question.OptionC || question.optionC,
        'D': question.OptionD || question.optionD
    };

    const correctAnswer = letterToOption[correctLetter.toUpperCase()];

    if (!correctAnswer) {
        return {
            isValid: false,
            confidence: 0,
            warning: `No option found for letter ${correctLetter}`,
            details: { correctLetter, options: letterToOption }
        };
    }

    // Extract key terms from both
    const answerTerms = extractKeyTerms(correctAnswer);
    const excerptTerms = extractKeyTerms(sourceExcerpt);
    const excerptText = sourceExcerpt.toLowerCase();

    // Count how many answer terms appear in excerpt
    let matchedTerms = 0;
    let matchedKeyTerms = [];

    for (const term of answerTerms) {
        if (excerptText.includes(term)) {
            matchedTerms++;
            matchedKeyTerms.push(term);
        }
    }

    // Calculate confidence
    const matchRatio = answerTerms.length > 0 ? matchedTerms / answerTerms.length : 0;
    const confidence = Math.round(matchRatio * 100);

    // Determine validity
    let isValid = confidence >= 50;
    let warning = null;

    if (confidence < 30) {
        warning = `Answer "${correctAnswer}" not found in source excerpt`;
        isValid = false;
    } else if (confidence < 50) {
        warning = `Low confidence: only ${matchedTerms}/${answerTerms.length} key terms matched`;
    } else if (confidence < 70) {
        warning = `Moderate confidence: verify answer matches source`;
    }

    return {
        isValid,
        confidence,
        warning,
        details: {
            correctAnswer,
            correctLetter,
            answerTerms,
            matchedTerms: matchedKeyTerms,
            totalTerms: answerTerms.length
        }
    };
}

/**
 * Batch validate answers
 * @param {Array} questions - Array of question objects
 * @returns {Array} Questions with answerValidation field added
 */
export function validateAnswersBatch(questions) {
    return questions.map(q => ({
        ...q,
        answerValidation: validateAnswer(q)
    }));
}

export default validateAnswer;
