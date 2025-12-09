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

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SamDeiter/UE5QuestionGenerator.git
    cd UE5QuestionGenerator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

## ⚙️ Configuration

1.  **API Key**: Enter your Google Gemini API Key in the **Settings** modal.
2.  **Google Sheets**: (Optional) Configure the Google Apps Script URL for Sheets integration.

## 🤝 Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` (if available) or submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
