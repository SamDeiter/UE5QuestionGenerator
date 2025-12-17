# UE5 Question Generator

A powerful, AI-driven tool for generating, translating, and managing quiz questions for Unreal Engine 5. Built with React, Tailwind CSS, and Google Gemini.

## 🚀 Features

### 🤖 AI-Powered Generation

- **Context-Aware**: Generates questions based on your specific source material (documentation, code snippets).
- **Multi-Language**: Automatically translates questions into 10+ languages including Chinese, Japanese, Korean, and Spanish.
- **Smart Context Optimization**: Automatically reduces token usage by summarizing repetitive content.

### 📊 Analytics & Metrics

- **Token Usage Tracking**: Real-time monitoring of input/output tokens and estimated costs.
- **Quality Metrics**: Visual dashboard showing question distribution by difficulty, type, and discipline.
- **Vertex AI Ready**: Export "Gold Standard" (>75% score) and "Rejected" data for fine-tuning custom models.

### 🛠️ Advanced Tools

- **Review Mode**: Efficiently review, edit, and approve generated questions.
- **Database View**: Manage your entire question bank with filtering and bulk actions.
- **Google Sheets Integration**: Seamlessly import/export questions to Google Sheets.

### ♿ Accessibility

- **Inclusive Design**: Full keyboard navigation support with visible focus indicators.
- **Reduced Motion**: Respects system preferences for reduced motion.
- **Screen Reader Support**: ARIA labels and semantic HTML for better compatibility.

## 🔒 Security Architecture

### API Key Management

**Production**: All Gemini API calls are routed through Firebase Cloud Functions to keep API keys secure on the server side.

**Development**: LocalStorage keys (`ue5_gen_config.geminiApiKey`) are available for local development and testing only. These keys are never exposed in production builds.

#### Cloud Functions

All AI operations use secure Firebase Cloud Function endpoints:

- `generateContent` - Question generation with context optimization
- `generateCritique` - Quality assessment and scoring
- `generateTags` - Automatic tag generation
- `generateTranslation` - Multi-language translation

**Client-Side Security**:

- ✅ NO direct Gemini API calls in production code
- ✅ All API requests authenticated via Firebase Auth
- ✅ Rate limiting enforced at Cloud Function level
- ✅ Input validation and sanitization

#### Development Setup

1. Copy `.env.example` to `.env`
2. Add your Firebase configuration to `.env`
3. For local testing, optionally add `VITE_GEMINI_API_KEY` (dev-only)
4. Never commit `.env` to version control

#### Production Deployment

1. Set Firebase Cloud Function environment variables:

   ```bash
   firebase functions:config:set gemini.api_key="YOUR_API_KEY"
   ```

2. Deploy Cloud Functions:

   ```bash
   npm run deploy:functions
   ```

3. Client-side code automatically uses Cloud Functions (no configuration needed)

### Content Security

This application implements:

- ✅ XSS prevention with DOMPurify sanitization
- ✅ Content Security Policy (CSP) headers
- ✅ Input validation on user-generated content
- ✅ Firebase Authentication for user management
- ✅ Role-based access control (Admin/User)
- ✅ Secure invite-only registration system

### Reporting Security Issues

If you discover a security vulnerability, please email the repository owner instead of using the issue tracker.

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

3. **Start the development server:**

    ```bash
    npm run dev
    ```

## ⚙️ Configuration

1. **API Key**: Enter your Google Gemini API Key in the **Settings** modal.
2. **Google Sheets**: (Optional) Configure the Google Apps Script URL for Sheets integration.

## 🤝 Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` (if available) or submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
