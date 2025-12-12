export const TUTORIAL_SCENARIOS = {
  // 1. General Welcome Tour (Landing Page)
  welcome: [
    {
      id: "welcome",
      title: "Welcome to UE5 Question Generator",
      content:
        "This tool helps you generate high-quality Unreal Engine 5 assessment questions using AI. We'll walk you through the main features to get you started quickly.",
      target: null,
      position: "center",
    },
    {
      id: "modes",
      title: "Choose Your Mode",
      content:
        "Use the navigation bar to switch between modes:\n• Creation – Generate new questions with AI\n• Review – Quality-check pending questions\n• Database – View and export approved questions\n• Analytics – Track generation metrics",
      target: '[data-tour="create-mode"]',
      position: "bottom",
    },
  ],

  // 2. Creation Mode Tour
  create: [
    {
      id: "discipline",
      title: "Step 1: Select a Discipline",
      content:
        "Choose from 10 UE5 discipline areas: Blueprints, C++ Programming, Lighting & Rendering, Materials, VFX (Niagara), Animation, World Building, Tech Art, Game Logic, or Networking. This helps the AI generate contextually relevant questions.",
      target: '[data-tour="discipline-selector"]',
      position: "right",
    },
    {
      id: "settings",
      title: "Step 2: Configure Settings",
      content:
        "Adjust the generation parameters:\n• Question Count – How many to generate (1-20)\n• Difficulty – Easy, Medium, Hard, or Balanced mix\n• Question Type – Multiple Choice, True/False, or both\n\nYou can also upload PDF documents for context.",
      target: '[data-tour="generation-settings"]',
      position: "right",
    },
    {
      id: "generate",
      title: "Step 3: Generate Questions",
      content:
        "Click this button to start AI generation. Questions will appear in the main panel. Generation typically takes 10-30 seconds depending on count and complexity.",
      target: '[data-tour="generate-button"]',
      position: "top",
    },
  ],

  // 3. Review Mode Tour
  review: [
    {
      id: "review-intro",
      title: "Quality Review Process",
      content:
        "Review mode shows pending questions one at a time. Each question needs human verification before being added to your approved database. This ensures only high-quality questions make it through.",
      target: null,
      position: "center",
    },
    {
      id: "review-card",
      title: "Question Card",
      content:
        "This card displays the current question with its difficulty badge, discipline tag, and answer options. Review the question text, verify the correct answer, and check that distractors are plausible but incorrect.",
      target: '[data-tour="review-card"]',
      position: "right",
    },
    {
      id: "critique",
      title: "AI Critique Tool",
      content:
        "Use the Critique button to get AI analysis of question quality. The AI evaluates clarity, accuracy, difficulty appropriateness, and suggests improvements. Great for spotting issues you might miss.",
      target: '[data-tour="critique-button"]',
      position: "bottom",
    },
    {
      id: "actions",
      title: "Accept or Reject",
      content:
        "Make your decision:\n• Accept – Moves the question to your approved Database\n• Reject – Removes the question permanently\n• Edit – Modify the question before accepting\n\nYou can also request variations or translations.",
      target: '[data-tour="review-actions"]',
      position: "top",
    },
  ],

  // 4. Database Mode Tour
  database: [
    {
      id: "db-intro",
      title: "Your Question Bank",
      content:
        "The Database view shows all your approved questions. These are ready for export and use in your assessments. Questions are organized by discipline and can be filtered/sorted.",
      target: null,
      position: "center",
    },
    {
      id: "db-grid",
      title: "Question Grid",
      content:
        "Browse your approved questions in this grid. Each row shows the question text, type, difficulty, discipline, and creation date. Click any row to expand and see full details.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "export",
      title: "Export Your Questions",
      content:
        "Use the Export menu to download your questions:\n• CSV – Standard spreadsheet format\n• Google Sheets – Direct sync to your Google Drive\n• SCORM – LMS-ready package format",
      target: '[data-tour="export-menu"]',
      position: "bottom",
    },
  ],

  // 5. Analytics Mode Tour
  analytics: [
    {
      id: "analytics-dashboard",
      title: "Analytics Overview",
      content:
        "Track your question generation performance with real-time metrics. Monitor acceptance rates, quality scores, token usage, and cost estimates all in one dashboard.",
      target: null,
      position: "center",
    },
    {
      id: "disciplines-tab",
      title: "Discipline Breakdown",
      content:
        "Click this tab to see question distribution across all 10 UE5 disciplines. Identify coverage gaps and see which areas need more questions. Click any discipline for detailed stats.",
      target: '[data-tour="disciplines-tab"]',
      position: "bottom",
    },
  ],
};

// Default export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome;
