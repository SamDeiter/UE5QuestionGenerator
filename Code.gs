// v1.9 - Multi-Language Master DB with Unique ID + New Fields + HARD RESET
const HEADERS = ['ID', 'Unique ID', 'Status', 'Discipline', 'Difficulty', 'Question Type', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Explanation', 'Language', 'SourceFile', 'QualityScore', 'AICritique', 'TokenCost', 'LastUpdated'];

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'read') {
      const sheets = ss.getSheets();
      let allData = [];
      // Read from ALL 'Master_' tabs
      sheets.forEach(sheet => {
        if (sheet.getName().startsWith("Master_") && sheet.getLastRow() > 1) {
          const data = sheet.getDataRange().getValues();
          const headers = data[0];
          const rows = data.slice(1);
          
          const sheetData = rows.map(row => {
            let obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i];
            });
            return obj;
          });
          allData = allData.concat(sheetData);
        }
      });
      const result = { status: 'Success', data: allData };
      const callback = e.parameter.callback;
      const jsonOutput = JSON.stringify(result);
      if (callback) {
        return ContentService.createTextOutput(`${callback}(${jsonOutput})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService.createTextOutput(jsonOutput).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'Error', message: 'Invalid action'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const result = { status: 'Error', message: err.toString() };
    const callback = e.parameter.callback;
    const jsonOutput = JSON.stringify(result);
    if (callback) {
      return ContentService.createTextOutput(`${callback}(${jsonOutput})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(jsonOutput).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Check for clear action - CLEARS ALL Master_ sheets
  if (e.parameter.action === 'clear') {
    const sheets = ss.getSheets();
    let clearedCount = 0;
    
    // Clear ALL Master_ sheets
    sheets.forEach(sheet => {
      if (sheet.getName().startsWith("Master_") && sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
        clearedCount++;
      }
    });
    
    return ContentService.createTextOutput(`
      <html>
        <body style="background-color: #111827; color: #ef4444; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h1>🗑️ All Data Cleared!</h1>
            <p style="color: #9ca3af;">${clearedCount} Master sheets have been wiped.</p>
            <script>setTimeout(() => { window.close(); }, 2000);</script>
          </div>
        </body>
      </html>
    `).setMimeType(ContentService.MimeType.HTML);
  }

  // --- HANDLE SAVE ACTION ---
  try {
    const payload = JSON.parse(e.parameter.data);
    const questions = payload.questions;
    const timestamp = new Date();

    // 1. SAVE TO MASTER DB (Split by Language)
    questions.forEach(q => {
      const lang = q.Language || 'English';
      const masterSheetName = `Master_${lang}`;
      let masterSheet = ss.getSheetByName(masterSheetName);
      
      if (!masterSheet) {
        masterSheet = ss.insertSheet(masterSheetName);
        masterSheet.appendRow(HEADERS);
        masterSheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e0e7ff"); // Light indigo for Master
        masterSheet.setTabColor("4f46e5"); // Indigo tab color
      }

      const row = [
        q.ID, q.uniqueId, 'Approved', q.Discipline, q.Difficulty, q.Type, q.Question, 
        q.OptionA, q.OptionB, q.OptionC, q.OptionD, q.Answer, q.Explanation, 
        q.Language, q.SourceFile || '', q.QualityScore || '', q.AICritique || '', q.TokenCost || '', timestamp
      ];
      masterSheet.appendRow(row);
    });

    // 2. CREATE SEPARATE EXPORT FILE (Granular Tabs)
    // Group by Language + Type + Difficulty
    const granularGroups = {};
    questions.forEach(q => {
      const lang = q.Language || 'English';
      const typeShort = q.Type.includes('True') ? 'TF' : 'MC';
      const diffShort = q.Difficulty.split(' ')[0]; // 'Easy', 'Medium', 'Hard'
      
      // Group Key: "English_TF_Easy"
      const groupKey = `${lang}_${typeShort}_${diffShort}`;
      
      if (!granularGroups[groupKey]) granularGroups[groupKey] = [];
      granularGroups[groupKey].push(q);
    });

    // Create ONE new Spreadsheet for this batch
    // Filename: UE5_Export_${Lang}_${Date}
    const batchName = `UE5_Export_${Object.keys(granularGroups)[0].split('_')[0]}_${Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm")}`;
    const newSS = SpreadsheetApp.create(batchName);
    const fileId = newSS.getId();
    
    // Create tabs for each granular group
    Object.keys(granularGroups).forEach(groupName => {
      let sheet = newSS.getSheetByName(groupName);
      if (!sheet) {
        sheet = newSS.insertSheet(groupName);
      }
      
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#dcfce7"); // Light green for export
      
      granularGroups[groupName].forEach(q => {
        const row = [
          q.ID, q.uniqueId, 'Approved', q.Discipline, q.Difficulty, q.Type, q.Question, 
          q.OptionA, q.OptionB, q.OptionC, q.OptionD, q.Answer, q.Explanation, 
          q.Language, q.SourceFile || '', q.QualityScore || '', q.AICritique || '', q.TokenCost || '', timestamp
        ];
        sheet.appendRow(row);
      });
    });

    // Remove default "Sheet1" if it's empty and not used
    const defaultSheet = newSS.getSheetByName('Sheet1');
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      newSS.deleteSheet(defaultSheet);
    }

    // Return Success Page
    const htmlOutput = `
      <html>
        <body style="background-color: #111827; color: #4ade80; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <svg style="width: 64px; height: 64px; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <h1 style="font-size: 24px; margin-bottom: 8px;">Export Successful!</h1>
            <p style="color: #9ca3af; margin-bottom: 24px;">${questions.length} questions saved to Master DB and new file.</p>
            <a href="https://docs.google.com/spreadsheets/d/${fileId}" target="_blank" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Export File</a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">This tab will close automatically...</p>
          </div>
          <script>setTimeout(() => { window.close(); }, 3000);</script>
        </body>
      </html>
    `;

    return ContentService.createTextOutput(htmlOutput);

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}
