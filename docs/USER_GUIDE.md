# UE5 Question Generator - User Guide

## Overview
The **UE5 Question Generator** is an AI-powered tool designed to help educators and technical artists generate, review, and manage quiz questions for Unreal Engine 5. It supports multiple languages, disciplines, and difficulty levels.

## 🛡️ Administrator Access
Certain features are restricted to **Administrators** only to ensure data integrity and security.

### How to Become an Admin
*   Admin status is granted based on your email address (must be whitelisted).
*   When logged in as an Admin, you will see a verified **ADMIN** badge next to your name in the top right corner.

### Admin-Only Features
1.  **Creation Mode:** Only admins can access the "Generate Questions" interface.
2.  **Tag Management:** Admins can create and delete custom tags for each discipline.
3.  **Advanced Settings:**
    *   **Vertex AI Data:** Access to training data export.
    *   **Danger Zone:** Bulk delete and database reset options.

---

## 🚀 Getting Started

1.  **Open the Application:** Launch the tool in your browser.
2.  **Enter Credentials:**
    *   **Creator Name:** Enter your name (used for tracking question authorship).
    *   **API Key:** Enter your Google Gemini API Key in the settings (if not already configured).

---

## 🛠️ Create Mode (Generation)
This is the default mode for generating new questions.

### 1. Configure Generation Settings
Use the **Generation Settings** panel (expandable sidebar) to customize your request:
*   **Discipline:** Choose the topic (e.g., Technical Art, Programming, Design).
*   **Language:** Select the target language for generation.
*   **Difficulty:**
    *   *Easy/Medium/Hard:* Specific difficulty levels.
    *   *Balanced All:* Generates a mix of difficulties (Batch size must be a multiple of 6).
*   **Batch Size:** Number of questions to generate at once (Max 20).

### 2. Generate Questions
*   Click the **"Generate Questions"** button (or press `Ctrl+Enter`).
*   The AI will draft questions based on your settings.
*   **Progress Bar:** Tracks your progress towards the daily target (default: 33 questions/category).

---

## 📝 Review Mode
After generation, questions appear in the **Review** list.

### Question Card Actions
*   **Accept (Green Check):** Mark the question as approved.
*   **Reject (Red X):** Mark the question as rejected.
*   **More Options (Vertical Dots):**
    *   **AI Critique:** Ask AI to analyze the question quality.
    *   **Explain Answer:** Get a detailed explanation of the correct answer.
    *   **Create Variations:** Generate similar questions based on the current one.
    *   **Copy Question:** Copy the question text to clipboard.

### Translation
*   **Flags:** Click a flag icon on a question card to generate or view a translation in that language.
*   **Switch Language:** If a translation exists, clicking the flag switches the card view to that language.

---

## 🗄️ Database Mode
View and manage your entire history of generated questions.

### Filtering & Search
*   **Search Bar:** Filter by question text, ID, or topic.
*   **Status Filters:** Show All, Pending, Accepted, or Rejected.
*   **Discipline/Difficulty Filters:** Narrow down the list by specific categories.

---

## 📤 Import & Export

### Exporting Data
Click the **"Export"** button in the sidebar to save your work:
1.  **Export to CSV:** Downloads a `.csv` file compatible with spreadsheets.
2.  **Export to Google Sheets:** Sends accepted questions directly to the configured Google Sheet.
3.  **Segmented Export:** Downloads multiple CSV files, organized by Language and Discipline.

### Importing Data
*   **Import CSV:** Drag and drop a previously exported CSV file to restore your session or review offline work.
*   **Language Detection:** The tool automatically detects the language from the filename (e.g., `questions_CN.csv`).

---

## ❓ Troubleshooting

### Common Issues
*   **"API Key Required":** Ensure you have entered a valid Gemini API key in the Advanced Settings.
*   **"Batch Size Error":** In "Balanced All" mode, batch size must be a multiple of 6 (e.g., 6, 12, 18).
*   **Export Failed:** Check your internet connection. For Google Sheets, ensure you have permission to access the script URL.

### Resetting the App
*   If the app behaves unexpectedly, you can clear your local data by clicking **"Clear All Data"** in the settings (Warning: This deletes all local history).
