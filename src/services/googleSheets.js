import { stripHtmlTags, formatDate } from '../utils/helpers';

export const fetchQuestionsFromSheets = async (sheetUrl) => {
    // We use a simple GET request. 
    // NOTE: This requires the script deployment to be "Anyone" for it to work 
    // without a complex Google Sign-In flow.
    const response = await fetch(sheetUrl);

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const json = await response.json();

    if (json.status === 'Success' && Array.isArray(json.data)) {
        return json.data;
    } else {
        throw new Error(json.message || "Invalid data format received");
    }
};

export const saveQuestionsToSheets = async (sheetUrl, questions) => {
    // Transform into JSON array matching CSV structure (without headers)
    const payloadData = questions.map((row, i) => {
        const cleanedSourceUrl = row.sourceUrl && !row.sourceUrl.includes("grounding-api") ? row.sourceUrl : "";
        const o = row.options || {};
        // Return data fields in the exact order the Google Apps Script expects (matching CSV format)
        return {
            "ID": (i + 1).toString(),
            "Question ID": row.uniqueId,
            "Discipline": row.discipline,
            "Type": row.type,
            "Difficulty": row.difficulty,
            "Question": stripHtmlTags(row.question),
            "Option A": stripHtmlTags(o.A),
            "Option B": stripHtmlTags(o.B),
            "Option C": stripHtmlTags(o.C),
            "Option D": stripHtmlTags(o.D || ""),
            "Correct Answer": row.correct,
            "Generation Date": formatDate(new Date()),
            "Source URL": cleanedSourceUrl,
            "Source Excerpt": stripHtmlTags(row.sourceExcerpt),
            "Creator": row.creatorName,
            "Reviewer": row.reviewerName,
            "Language": row.language || "English"
        };
    });

    // WORKAROUND: Use a hidden iframe to submit the form silently.
    // This allows the browser to send cookies (auth) without opening a new tab.
    const iframeId = 'hidden_upload_iframe';
    let iframe = document.getElementById(iframeId);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = sheetUrl;
    form.target = iframeId; // Target the hidden iframe

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(payloadData);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    // Clean up form after a short delay (iframe stays for next time)
    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
};
