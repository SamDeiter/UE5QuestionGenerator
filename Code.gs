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
