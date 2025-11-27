# Testing, Regression, and Deployment Plan (v1.6)

This document outlines the steps to verify the stability of the UE5 Question Generator, ensure no regressions were introduced by recent changes, and guide new users on setting up the project from scratch.

## 1. "Out of the Box" Setup Guide
To ensure this works "out of the git link" for a new user:

### Prerequisites
*   Node.js (v16+) installed.
*   A Google Account (for Google Sheets integration).
*   A Google Gemini API Key.

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/SamDeiter/UE5QuestionGenerator.git
    cd UE5QuestionGenerator
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Start Local Server**:
    ```bash
    npm run dev
    ```

### Critical Configuration (Google Apps Script)
The application requires a backend Google Apps Script to handle Sheets export. This **cannot** be automatically deployed via git and must be set up manually by each user (or a shared URL must be provided).

1.  Open [Google Apps Script](https://script.google.com/home/start).
2.  Create a **New Project**.
3.  Copy the code from `src/services/googleSheets.js` (specifically the `GOOGLE_SCRIPT_CODE` constant).
4.  Paste it into the script editor (`Code.gs`).
5.  **Deploy**:
    *   Click `Deploy` -> `New Deployment`.
    *   Select type: `Web App`.
    *   Description: `v1.6`.
    *   Execute as: `Me`.
    *   Who has access: `Anyone` (Critical for CORS).
6.  **Copy the Web App URL**.
7.  In the UE5 Question Generator App:
    *   Click **Settings** (Gear Icon).
    *   Paste the URL into **Google Apps Script URL**.
    *   Enter your **Gemini API Key**.

---

## 2. Regression Testing Plan
Perform these tests to ensure core functionality remains intact.

### A. Core Generation (The "Old" Flow)
*   [ ] **CSV Upload**: Upload a valid CSV source file. Ensure topics are detected.
*   [ ] **Generate Questions**: Click "Generate Questions". Verify questions appear.
*   [ ] **Review Mode**: Click "Review". Verify you can Accept/Reject/Edit questions.
*   [ ] **Edit Question**: Change text in a question and save. Verify update.

### B. Google Sheets Integration (The "New" Flow)
*   [ ] **Save to Sheets**:
    *   Generate/Approve 5+ questions.
    *   Click **Save** (in Settings) or **Export** (Top Bar).
    *   **Verify**:
        *   A new tab opens with a "Success" message.
        *   A new Google Sheet file is created in your Drive root (Granular Export).
        *   The `Master_English` (or relevant language) tab in your Script's spreadsheet is updated.
*   [ ] **Load from Sheets**:
    *   Refresh the app.
    *   Click **Load**.
    *   **Verify**: Questions from the Master DB appear in the app.
*   [ ] **Hard Reset**:
    *   Go to **DB View**.
    *   Click **Hard Reset**.
    *   **Verify**:
        *   Confirmation prompt appears.
        *   Success message in new tab.
        *   All `Master_` tabs in Google Sheets are cleared.
        *   App local view is cleared.

### C. Multi-Language Support
*   [ ] **Translation**:
    *   Generate English questions.
    *   Use "Bulk Translate" to generate Chinese versions.
    *   Export.
    *   **Verify**:
        *   `Master_English` tab has English questions.
        *   `Master_Chinese (Simplified)` tab has Chinese questions.
        *   Separate export files are created for each language group.

### D. App State & Persistence
*   [ ] **Local Storage**:
    *   Reload the page. Verify API Key and Sheet URL persist.
    *   Verify "Pending" questions persist (unless cleared).
*   [ ] **Clear Local Data**:
    *   Click **Settings** -> **Clear Local Data**.
    *   **Verify**: App reloads, Name Entry modal appears, all questions are gone.

---

## 3. Known Limitations & Edge Cases
*   **Browser Popups**: The "Save" and "Hard Reset" features open new tabs. Pop-up blockers may interfere.
*   **Google Quotas**: Heavy usage of "Bulk Translate" may hit Gemini API rate limits.
*   **Sheet Limits**: Google Sheets has a 10M cell limit. The "Hard Reset" is essential for long-term maintenance.

## 4. Next Steps for Development
1.  **Automated Testing**: Implement Vitest/Jest for unit testing `helpers.js` and `googleSheets.js` logic.
2.  **CI/CD**: Set up a GitHub Action to build the project on push (ensure no build errors).
3.  **Environment Variables**: Move default configuration to `.env` files for easier developer setup.
