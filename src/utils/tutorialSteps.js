export const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to UE5 Question Generator',
        content: 'This tool helps you generate high-quality Unreal Engine 5 assessment questions using AI. Let\'s take a quick tour!',
        target: null, // Center screen
        position: 'center'
    },
    {
        id: 'discipline',
        title: 'Select a Discipline',
        content: 'Start by choosing the specific area of UE5 you want to generate questions for (e.g., Blueprints, C++, Lumen). You can also create custom tags in Settings for more focused generation.',
        target: '[data-tour="discipline-selector"]',
        position: 'right'
    },
    {
        id: 'upload',
        title: 'Upload Context (Optional)',
        content: 'Click "Open Settings" to upload PDF or text files (like documentation) to generate questions based on specific source material.',
        target: '[data-tour="open-settings"]',
        position: 'top'
    },
    {
        id: 'settings',
        title: 'Generation Settings',
        content: 'Adjust the difficulty, question type (Multiple Choice/True False), and the number of questions to generate. All questions are generated in English first.',
        target: '[data-tour="generation-settings"]',
        position: 'right'
    },
    {
        id: 'generate',
        title: 'Generate Questions',
        content: 'Click this button to start the AI generation process. It usually takes a few seconds per question.',
        target: '[data-tour="generate-button"]',
        position: 'right'
    },
    {
        id: 'create-mode',
        title: 'Create Mode - Question List',
        content: 'After generation, questions appear here in Create Mode. This is your workspace for newly generated questions that need review.',
        target: '[data-tour="review-area"]',
        position: 'left'
    },
    {
        id: 'review-mode',
        title: 'Review Mode - Quality Control',
        content: 'Switch to Review Mode to carefully evaluate each question. Accept good questions, reject bad ones, or use AI Critique to get improvement suggestions. Only accepted questions can be translated to other languages.',
        target: null,
        position: 'center'
    },
    {
        id: 'database-view',
        title: 'Database View - Your Question Bank',
        content: 'The Database View shows all your accepted questions stored in Firestore. This is your permanent question bank that syncs across devices. You can export, translate, or "kick back" questions to Review Mode for further refinement.',
        target: null,
        position: 'center'
    },
    {
        id: 'workflow',
        title: 'The Complete Workflow',
        content: '1️⃣ Generate in Create Mode → 2️⃣ Review & Accept/Reject → 3️⃣ Questions auto-save to Database → 4️⃣ Translate accepted English questions → 5️⃣ Export to Google Sheets or CSV. Your questions are always backed up in Firestore!',
        target: null,
        position: 'center'
    }
];
