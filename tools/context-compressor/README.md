# Context Compressor

CLI utility to compress AI chat logs by 70% while retaining 100% of technical value.

## Setup

1. **Install dependencies:**
   ```bash
   cd tools/context-compressor
   npm install
   ```

2. **Configure API key:**
   Create a `.env` file with your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   Get a free API key from: https://aistudio.google.com

## Usage

```bash
npm run zip <path-to-chat-log>
```

**Example:**
```bash
npm run zip ../../conversation_log.txt
```

## Output

Creates a compressed markdown file: `restore_point_[TIMESTAMP].md`

This file can be used to restore context in your next AI session with 70% fewer tokens.
