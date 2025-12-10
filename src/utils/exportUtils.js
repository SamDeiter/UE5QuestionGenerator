import { safe } from './stringHelpers';
import { formatDate } from './dateHelpers';
import { FIELD_DELIMITER } from './constants';

/**
 * Generates CSV content from question array
 * @param {Array} validQuestions - Questions to export
 * @param {string} creatorName - Creator name for CSV
 * @param {string} reviewerName - Reviewer name for CSV
 * @param {boolean} includeHeaders - Whether to include CSV header row
 * @returns {string} CSV-formatted string
 */
export const getCSVContent = (validQuestions, creatorName, reviewerName, includeHeaders = true) => {
    const headers = [
        "ID", "Question ID", "Discipline", "Type", "Difficulty", "Question",
        "Option A", "Option B", "Option C", "Option D", "Correct Answer",
        "Generation Date", "Source URL", "Source Excerpt",
        "Source Verified", "Human Verified", "Human Verified At", "Human Verified By",
        "Creator", "Reviewer", "Language", "Quality Score", "AI Critique",
        "Token Cost", "Status", "Rejection Reason", "Rejected At"
    ];
    let csvContent = includeHeaders ? headers.map(safe).join(FIELD_DELIMITER) + '\n' : '';
    const generationDate = formatDate(new Date());

    validQuestions.forEach((row, i) => {
        const cleanedSourceUrl = row.sourceUrl && !row.sourceUrl.includes("grounding-api") ? row.sourceUrl : "";
        const o = row.options || {};

        // Source verification status for export
        let sourceVerifiedLabel = 'Unknown';
        if (row.sourceVerified === true) sourceVerifiedLabel = 'Verified';
        else if (row.sourceVerified === 'unverified') sourceVerifiedLabel = 'Unverified';
        else if (row.sourceVerified === 'assumed') sourceVerifiedLabel = 'Assumed';
        else if (row.sourceVerified === 'missing') sourceVerifiedLabel = 'Missing';
        else if (row.sourceVerified === false) sourceVerifiedLabel = 'Invalid';

        const rowData = [
            (i + 1).toString(),
            row.uniqueId,
            row.discipline,
            row.type,
            row.difficulty,
            row.question,
            o.A,
            o.B,
            o.C,
            o.D || "",
            row.correct,
            generationDate,
            cleanedSourceUrl,
            row.sourceExcerpt,
            sourceVerifiedLabel,
            row.humanVerified ? 'Yes' : 'No',
            row.humanVerifiedAt || '',
            row.humanVerifiedBy || '',
            creatorName,
            reviewerName,
            row.language || "English",
            row.critiqueScore || row.initialQuality || "",
            row.critique || "",
            row.tokenCost || "",
            row.status || "pending",
            row.rejectionReason || "",
            row.rejectedAt || ""
        ];
        csvContent += rowData.map(safe).join(FIELD_DELIMITER) + '\n';
    });
    return csvContent;
};

/**
 * Segments questions by Language, Discipline, Difficulty, and Type
 * @param {Array} questions - List of questions to segment
 * @returns {Object} Grouped questions map
 */
export const segmentQuestions = (questions) => {
    return questions.reduce((acc, q) => {
        const typeAbbrev = q.type === 'True/False' ? 'T/F' : 'MC';
        // Use a unique key combining all segmentation requirements
        const key = `${q.language || 'English'}_${q.discipline}_${q.difficulty}_${typeAbbrev}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
    }, {});
};
