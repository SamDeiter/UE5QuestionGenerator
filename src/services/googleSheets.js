import { stripHtmlTags, formatDate } from '../utils/helpers';

export const fetchQuestionsFromSheets = (sheetUrl) => {
    return new Promise((resolve, reject) => {
        // Create a unique callback name
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

        // Define the callback function globally
        window[callbackName] = (data) => {
            delete window[callbackName];
            document.body.removeChild(script);
            if (data.status === 'Success' && Array.isArray(data.data)) {
                resolve(data.data);
            } else {
                reject(new Error(data.message || "Invalid data format received"));
            }
        };

        // Create the script element
        const script = document.createElement('script');
        // Append callback parameter to URL
        const separator = sheetUrl.includes('?') ? '&' : '?';
        script.src = `${sheetUrl}${separator}callback=${callbackName}&action=read`;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error("Connection failed. 1. Ensure you added the 'doGet' function. 2. Redeploy as 'New Version'. 3. Set Access to 'Anyone'."));
        };

        // Append to body to trigger request
        document.body.appendChild(script);
    });
};

export const saveQuestionsToSheets = async (sheetUrl, questions) => {
    // Transform into JSON array matching CSV structure (without headers)
    const payloadData = questions.map((row, i) => {
        const cleanedSourceUrl = row.sourceUrl && !row.sourceUrl.includes("grounding-api") ? row.sourceUrl : "";
        const o = row.options || {};
        // Return data fields matching the User's Google Apps Script expected keys
        return {
            "id": (i + 1).toString(),
            "uniqueId": row.uniqueId,
            "discipline": row.discipline,
            "type": row.type,
            "difficulty": row.difficulty,
            "question": stripHtmlTags(row.question),
            "optionA": stripHtmlTags(o.A),
            "optionB": stripHtmlTags(o.B),
            "optionC": stripHtmlTags(o.C),
            "optionD": stripHtmlTags(o.D || ""),
            "correctAnswer": row.correct,
            "generationDate": formatDate(new Date()),
            "sourceUrl": cleanedSourceUrl,
            "sourceExcerpt": stripHtmlTags(row.sourceExcerpt),
            "creator": row.creatorName,
            "reviewer": row.reviewerName,
            "language": row.language || "English"
        };
    });

    // Use a new tab to submit the form. 
    // This ensures that if there is an Auth/Permission error (403), the user SEES it.
    // Hidden iframes swallow auth errors silently.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = sheetUrl;
    form.target = '_blank'; // Open in new tab

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(payloadData);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    // Clean up form after submission
    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
};

export const clearQuestionsFromSheets = async (sheetUrl) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = sheetUrl;
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'action';
    input.value = 'clear';
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
};
