
// Remove default "Sheet1" if it's empty and not used
const defaultSheet = newSS.getSheetByName('Sheet1');
if (defaultSheet && defaultSheet.getLastRow() === 0) {
    newSS.deleteSheet(defaultSheet);
}

// Return Success Page
const htmlOutput = \`
      <html>
        <body style="background-color: #111827; color: #4ade80; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <svg style="width: 64px; height: 64px; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <h1 style="font-size: 24px; margin-bottom: 8px;">Export Successful!</h1>
            <p style="color: #9ca3af; margin-bottom: 24px;">\${questions.length} questions saved to Master DB and new file.</p>
            <a href="https://docs.google.com/spreadsheets/d/\${fileId}" target="_blank" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Export File</a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">This tab will close automatically...</p>
          </div>
          <script>setTimeout(() => { window.close(); }, 3000);</script>
        </body>
      </html>
    \`;

    return ContentService.createTextOutput(htmlOutput);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}
`;

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
            "ID": (i + 1).toString(), // Changed from "id" to "ID"
            "uniqueId": row.uniqueId, // This field is not used in the new GAS, but kept for consistency
            "Discipline": row.discipline, // Changed from "discipline" to "Discipline"
            "Type": row.type, // Changed from "type" to "Type"
            "Difficulty": row.difficulty, // Changed from "difficulty" to "Difficulty"
            "Question": stripHtmlTags(row.question), // Changed from "question" to "Question"
            "OptionA": stripHtmlTags(o.A), // Changed from "optionA" to "OptionA"
            "OptionB": stripHtmlTags(o.B), // Changed from "optionB" to "OptionB"
            "OptionC": stripHtmlTags(o.C), // Changed from "optionC" to "OptionC"
            "OptionD": stripHtmlTags(o.D || ""), // Changed from "optionD" to "OptionD"
            "Answer": row.correct, // Changed from "correctAnswer" to "Answer"
            "Explanation": stripHtmlTags(row.explanation || ""), // Added Explanation
            "Language": row.language || "English", // Changed from "language" to "Language"
            "SourceFile": cleanedSourceUrl, // Changed from "sourceUrl" to "SourceFile"
            "sourceExcerpt": stripHtmlTags(row.sourceExcerpt), // This field is not used in the new GAS, but kept for consistency
            "creator": row.creatorName, // This field is not used in the new GAS, but kept for consistency
            "reviewer": row.reviewerName, // This field is not used in the new GAS, but kept for consistency
        };
    });

    // The new GAS expects a 'questions' array inside the 'data' parameter
    const finalPayload = { questions: payloadData };

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
    input.value = JSON.stringify(finalPayload); // Stringify the final payload
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
