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
        "Use the navigation bar to switch between modes:\n• Create – Generate new questions with AI\n• Review – Quality-check pending questions\n• Database – View and export approved questions\n• Analytics – Track generation metrics",
      target: '[data-tour="create-mode"]',
      position: "bottom",
    },
  ],

  // 2. Creation Mode Tour - More comprehensive
  create: [
    {
      id: "create-welcome",
      title: "Creation Mode",
      content:
        "Welcome to Creation Mode! This is where you'll generate new assessment questions using AI. Let's walk through the process step by step.",
      target: null,
      position: "center",
    },
    {
      id: "discipline",
      title: "Step 1: Select a Discipline",
      content:
        "Choose the UE5 discipline area for your questions. Options include:\n• Blueprints – Visual scripting\n• C++ – Native programming\n• Materials – Look development\n• Niagara – VFX systems\n• And 6 more specialized areas",
      target: '[data-tour="discipline-selector"]',
      position: "right",
    },
    {
      id: "settings",
      title: "Step 2: Configure Settings",
      content:
        "Set your generation preferences:\n• Difficulty – Beginner, Intermediate, or Expert\n• Type – Multiple Choice or True/False\n\nThese settings determine the complexity and format of generated questions.",
      target: '[data-tour="generation-settings"]',
      position: "right",
    },
    {
      id: "generate",
      title: "Step 3: Generate Questions",
      content:
        "Click this button to start AI generation. The process typically takes 10-30 seconds. Generated questions will appear in the main panel for review.",
      target: '[data-tour="generate-button"]',
      position: "top",
    },
    {
      id: "create-done",
      title: "You're Ready!",
      content:
        "That's the basic workflow! After generating questions, switch to Review mode to quality-check them before adding to your database.\n\nTip: Use the Focus Tags in advanced settings to target specific sub-topics.",
      target: null,
      position: "center",
    },
  ],

  // 3. Review Mode Tour - More comprehensive
  review: [
    {
      id: "review-welcome",
      title: "Review Mode",
      content:
        "Your job: Review each AI-generated question and decide if it's good enough. Follow along and click each step as we guide you!",
      target: null,
      position: "center",
    },
    {
      id: "review-nav",
      title: "Step 1: Pick a Question",
      content:
        "Use PREV and NEXT buttons to browse pending questions. The counter shows your progress (1 of 6, etc).",
      target: '[data-tour="review-nav"]',
      position: "bottom",
    },
    {
      id: "review-card",
      title: "Step 2: Read & Check",
      content:
        "Read the question. Is it clear? Is the highlighted answer correct? Are the other options wrong but believable?",
      target: '[data-tour="review-card"]',
      position: "center",
    },
    {
      id: "critique",
      title: "Step 3: Run AI Critique",
      content:
        "Click the CRITIQUE button! The AI will analyze the question and give you a quality score with feedback. Wait for it to complete before deciding.",
      target: '[data-tour="critique-button"]',
      position: "bottom",
    },
    {
      id: "actions",
      title: "Step 4: Accept or Reject",
      content:
        "Make your call:\n• ✓ ACCEPT – Good question, add to Database\n• ✗ REJECT – Bad question, discard it\n\nThen click NEXT to continue.",
      target: '[data-tour="review-actions"]',
      position: "top",
    },
    {
      id: "review-done",
      title: "That's It!",
      content:
        "Repeat for each question: Read → Critique → Accept/Reject → Next. Accepted questions appear in the Database tab.",
      target: null,
      position: "center",
    },
  ],

  // 4. Database Mode Tour - More comprehensive
  database: [
    {
      id: "db-welcome",
      title: "Database Mode",
      content:
        "Welcome to Your Question Bank! This is where all your approved questions are stored. From here, you can browse, filter, and export your questions for use in assessments.",
      target: null,
      position: "center",
    },
    {
      id: "db-grid",
      title: "Question Grid",
      content:
        "Your approved questions are displayed in this grid. Each row shows:\n• Question text preview\n• Type (MC or T/F)\n• Difficulty level\n• Discipline category\n\nClick any row to expand and see full details.",
      target: '[data-tour="database-grid"]',
      position: "center",
    },
    {
      id: "db-filter",
      title: "Filter & Sort",
      content:
        "Use the toolbar to filter questions by:\n• Discipline\n• Difficulty\n• Question type\n• Search keywords\n\nThis helps you find specific questions quickly.",
      target: null,
      position: "center",
    },
    {
      id: "export",
      title: "Export Your Questions",
      content:
        "Ready to use your questions? Export them in multiple formats:\n• CSV – For spreadsheets and custom imports\n• Google Sheets – Direct cloud sync\n• SCORM 1.2 – LMS-ready package\n\nExports include all question data.",
      target: '[data-tour="export-menu"]',
      position: "bottom",
    },
    {
      id: "db-done",
      title: "Build Your Library!",
      content:
        "Your question bank grows as you accept more questions. Aim for good coverage across disciplines and difficulty levels for comprehensive assessments.\n\nCheck the Analytics tab to see your coverage gaps!",
      target: null,
      position: "center",
    },
  ],

  // 5. Analytics Mode Tour - More comprehensive
  analytics: [
    {
      id: "analytics-welcome",
      title: "Analytics Dashboard",
      content:
        "Welcome to Analytics! Track your question generation performance with real-time metrics. Monitor acceptance rates, quality scores, and identify coverage gaps.",
      target: null,
      position: "center",
    },
    {
      id: "analytics-overview",
      title: "Overview Stats",
      content:
        "The overview shows your key metrics:\n• Total Questions – Your complete bank size\n• Acceptance Rate – Quality pass rate\n• Average Quality – Mean critique score\n• Estimated Cost – API token usage cost",
      target: null,
      position: "center",
    },
    {
      id: "disciplines-tab",
      title: "Discipline Breakdown",
      content:
        "Click this tab to see question distribution across all 10 UE5 disciplines. The chart visualizes:\n• Questions per discipline\n• Coverage gaps (low numbers)\n• Click any discipline for detailed stats",
      target: '[data-tour="disciplines-tab"]',
      position: "bottom",
    },
    {
      id: "analytics-quality",
      title: "Quality Tab",
      content:
        "The Quality tab shows:\n• Score distribution histogram\n• Token usage trends\n• Generation history\n\nUse this to optimize your question generation strategy.",
      target: null,
      position: "center",
    },
    {
      id: "analytics-done",
      title: "Data-Driven Decisions",
      content:
        "Use these analytics to:\n• Identify weak discipline areas\n• Track quality over time\n• Optimize for cost efficiency\n\nRegular monitoring helps build a balanced, high-quality question bank!",
      target: null,
      position: "center",
    },
  ],
};

// Default export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome;
