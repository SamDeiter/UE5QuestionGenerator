export const TUTORIAL_SCENARIOS = {
    // 1. General Welcome Tour (Landing Page)
    welcome: [
        {
            id: 'welcome',
            title: 'Welcome to UE5 Question Generator',
            content: 'This tool helps you generate high-quality Unreal Engine 5 assessment questions using AI. Let\'s take a quick tour!',
            target: null, 
            position: 'center'
        },
        {
            id: 'modes',
            title: 'Application Modes',
            content: 'Choose a mode to start: "Creation" for AI generation, "Review" for quality control, or "Database" to view your saved question bank.',
            target: null,
            position: 'center'
        }
    ],

    // 2. Creation Mode Tour
    create: [
        {
            id: 'discipline',
            title: 'Select a Discipline',
            content: 'Start by choosing the specific area of UE5 you want to generate questions for (e.g., Blueprints, C++, Lumen).',
            target: '[data-tour="discipline-selector"]',
            position: 'right'
        },
        {
            id: 'upload',
            title: 'Context & Settings',
            content: 'Upload PDFs for context or adjust generation settings (difficulty, count) in the sidebar.',
            target: '[data-tour="generation-settings"]',
            position: 'right'
        },
        {
            id: 'generate',
            title: 'Generate Questions',
            content: 'Click "Generate Questions" to start the AI process. Questions will appear in the main list.',
            target: '[data-tour="generate-button"]',
            position: 'top'
        }
    ],

    // 3. Review Mode Tour
    review: [
        {
            id: 'review-card',
            title: 'Review Card',
            content: 'This card displays the current question. Review its difficulty, source context, and content here.',
            target: '[data-tour="review-card"]',
            position: 'right'
        },
        {
            id: 'critique',
            title: 'AI Critique',
            content: 'Use the "Critique" button to have AI analyze the question quality and suggest improvements.',
            target: '[data-tour="critique-button"]',
            position: 'bottom'
        },
        {
            id: 'actions',
            title: 'Accept or Reject',
            content: 'Accept good questions to move them to the Database. Reject or Edit bad ones.',
            target: '[data-tour="review-actions"]',
            position: 'top'
        }
    ],

    // 4. Database Mode Tour
    database: [
        {
            id: 'db-grid',
            title: 'Question Bank',
            content: 'This list shows all your approved questions. You can sort, filter, and export them from here.',
            target: '[data-tour="database-grid"]',
            position: 'center'
        },
        {
            id: 'export',
            title: 'Export Options',
            content: 'Click "Export" to download your questions as CSV or sync them to Google Sheets.',
            target: '[data-tour="export-menu"]',
            position: 'bottom'
        }
    ],

    // 5. Analytics Mode Tour
    analytics: [
        {
            id: 'analytics-dashboard',
            title: 'Analytics Dashboard',
            content: 'Track your question generation output, quality scores, and costs over time.',
            target: null,
            position: 'center'
        },
        {
            id: 'disciplines-tab',
            title: 'Discipline Breakdown',
            content: 'View detailed stats per discipline to identify coverage gaps.',
            target: '[data-tour="disciplines-tab"]', // Need to ensure this attribute exists in AnalyticsView
            position: 'bottom'
        }
    ]
};

// Default export for backward compatibility
export const TUTORIAL_STEPS = TUTORIAL_SCENARIOS.welcome;
