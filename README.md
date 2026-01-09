# UE5 Question Generator

A powerful, AI-driven tool for generating, translating, and managing quiz questions for Unreal Engine 5 training. Built with React, Vite, Tailwind CSS, and Google Gemini AI.

[![Deploy Status](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)](https://samdeiter.github.io/UE5QuestionGenerator/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Live Demo

**Production App**: [https://samdeiter.github.io/UE5QuestionGenerator/](https://samdeiter.github.io/UE5QuestionGenerator/)

## ✨ Features

### 🤖 AI-Powered Question Generation

- **Context-Aware**: Generates questions based on your specific source material (documentation, code snippets)
- **Multi-Language**: Automatically translates questions into 10+ languages including Chinese, Japanese, Korean, and Spanish
- **Smart Context Optimization**: Automatically reduces token usage by summarizing repetitive content
- **Quality Critique**: AI-powered scoring and suggested rewrites for low-quality questions

### 📊 Analytics & Reviewer Tracking

- **Token Usage Tracking**: Real-time monitoring of input/output tokens and estimated costs
- **Quality Metrics**: Visual dashboard showing question distribution by difficulty, type, and discipline
- **Reviewer Analytics**: Track reviewer activity, acceptance rates, and review durations
- **Vertex AI Ready**: Export "Gold Standard" (>75% score) and "Rejected" data for fine-tuning custom models

### 🛠️ Workflow Tools

- **Create Mode**: Generate new questions with AI assistance
- **Review Mode**: Efficiently review, critique, and approve generated questions
- **Database View**: Manage your entire question bank with filtering and bulk actions
- **SCORM Export**: Export question banks as SCORM 1.2 packages for LMS integration
- **Google Sheets Integration**: Seamlessly import/export questions to Google Sheets

### 👥 Multi-User Collaboration

- **Concurrent Editing**: Real-time edit locks prevent conflicts when multiple reviewers work simultaneously
- **Audit Trail**: Complete history of question changes and reviewer actions
- **Role-Based Access**: Admin and Reviewer roles with appropriate permissions
- **Invite System**: Secure invite-only registration for new users

### ♿ Accessibility

- **Inclusive Design**: Full keyboard navigation support with visible focus indicators
- **Reduced Motion**: Respects system preferences for reduced motion
- **Screen Reader Support**: ARIA labels and semantic HTML for better compatibility

## 🔒 Security Architecture

### API Key Management

**Production**: All Gemini API calls are routed through Firebase Cloud Functions to keep API keys secure on the server side.

**Development**: LocalStorage keys are available for local development and testing only. These keys are never exposed in production builds.

#### Cloud Functions

All AI operations use secure Firebase Cloud Function endpoints:

- `generateContent` - Question generation with context optimization
- `generateCritique` - Quality assessment and scoring
- `generateTags` - Automatic tag generation
- `generateTranslation` - Multi-language translation

**Security Measures**:

- ✅ NO direct Gemini API calls in production code
- ✅ All API requests authenticated via Firebase Auth
- ✅ Rate limiting enforced at Cloud Function level
- ✅ Input validation and sanitization
- ✅ XSS prevention with DOMPurify sanitization
- ✅ Content Security Policy (CSP) headers
- ✅ Role-based access control (Admin/Reviewer)

## 📦 Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/SamDeiter/UE5QuestionGenerator.git
    cd UE5QuestionGenerator
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your Firebase configuration
    ```

4. **Start the development server:**

    ```bash
    npm run dev
    ```

## 🚀 Deployment

### GitHub Pages

```bash
npm run build
npm run deploy
```

### Firebase Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

## ⚙️ Configuration

1. **Firebase**: Configure your Firebase project settings in `.env`
2. **Gemini API**: Set up Firebase Cloud Functions with your Gemini API key
3. **Google Sheets**: (Optional) Configure the Google Apps Script URL for Sheets integration

## 📁 Project Structure

```
├── src/
│   ├── agents/          # Concurrent editing, session management
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Firebase, Gemini API integrations
│   └── utils/           # Helper functions, constants
├── functions/           # Firebase Cloud Functions
├── config/              # Firebase rules and configuration
├── docs/                # Documentation
└── public/              # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Backend powered by [Firebase](https://firebase.google.com/)
- Icons from [Lucide](https://lucide.dev/)
