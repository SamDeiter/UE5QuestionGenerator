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
        content: 'Start by choosing the specific area of UE5 you want to generate questions for (e.g., Blueprints, C++, Lumen).',
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
        content: 'Adjust the difficulty, question type (Multiple Choice/True False), and the number of questions to generate.',
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
        id: 'review',
        title: 'Review Mode',
        content: 'After generation, questions appear here. You can edit, accept, reject, or ask the AI to critique them.',
        target: '[data-tour="review-area"]',
        position: 'left'
    }
];
