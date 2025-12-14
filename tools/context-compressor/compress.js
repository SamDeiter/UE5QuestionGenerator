#!/usr/bin/env node

/**
 * Context Compressor - Reduce AI context windows by 70% while retaining 100% technical value
 * 
 * Usage: node compress.js <input-file>
 * Example: node compress.js ./raw_chat_log.txt
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Configuration
const MODEL_NAME = 'gemini-1.5-flash';
const SYSTEM_INSTRUCTION = `You are a Technical Archivist. Your goal is to reduce token count by 70% while retaining 100% of the technical value.

RULES:
1. Discard all conversational filler (hello, thank you, pleasantries).
2. Keep the final version of any code blocks generated (discard intermediate/failed attempts).
3. Bullet point the key architectural decisions.
4. Preserve all technical context: file paths, error messages, git commits, configuration changes.
5. Output strictly in Markdown format with clear sections.
6. Maintain chronological order of technical decisions.
7. Include a summary at the top with: objective, files changed, and outcome.`;

async function compressContext(inputFilePath) {
  try {
    // Validate input file
    if (!fs.existsSync(inputFilePath)) {
      console.error(`❌ File not found: ${inputFilePath}`);
      process.exit(1);
    }

    // Read input file
    console.log(`📖 Reading: ${inputFilePath}`);
    const rawContent = fs.readFileSync(inputFilePath, 'utf-8');
    const inputTokens = Math.ceil(rawContent.length / 4); // Rough estimate
    console.log(`📊 Input size: ~${inputTokens.toLocaleString()} tokens`);

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in .env file');
      console.error('💡 Create a .env file with: GEMINI_API_KEY=your_key_here');
      console.error('💡 Get a key from: https://aistudio.google.com');
      process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION
    });

    // Compress content
    console.log('🔄 Compressing with Gemini...');
    const result = await model.generateContent(rawContent);
    const compressedContent = result.response.text();
    
    const outputTokens = Math.ceil(compressedContent.length / 4);
    const reduction = Math.round((1 - outputTokens / inputTokens) * 100);
    console.log(`✅ Output size: ~${outputTokens.toLocaleString()} tokens (${reduction}% reduction)`);

    // Save output
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFileName = `restore_point_${timestamp}.md`;
    const outputPath = path.join(path.dirname(inputFilePath), outputFileName);
    
    fs.writeFileSync(outputPath, compressedContent, 'utf-8');
    console.log(`💾 Saved to: ${outputPath}`);
    console.log('✨ Done! You can now use this file to restore context in your next session.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node compress.js <input-file>');
  console.error('Example: node compress.js ./raw_chat_log.txt');
  process.exit(1);
}

const inputFile = args[0];
compressContext(inputFile);
