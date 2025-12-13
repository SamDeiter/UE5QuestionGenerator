#!/usr/bin/env node
/**
 * Node.js wrapper for Python MCP server (CommonJS)
 * Handles stdio properly to avoid Windows CRLF issues
 */
const { spawn } = require("child_process");
const path = require("path");

const pythonPath =
  "C:\\Users\\Sam Deiter\\Documents\\GitHub\\UE5QuestionGenerator\\.venv\\Scripts\\python.exe";
const serverPath =
  "C:\\Users\\Sam Deiter\\Documents\\GitHub\\UE5QuestionGenerator\\optimized_performance_server.py";

// Spawn Python process with proper stdio handling
const python = spawn(pythonPath, ["-u", serverPath], {
  stdio: ["pipe", "pipe", "ignore"], // stdin, stdout, stderr (ignore stderr)
  windowsHide: true,
});

// Pipe stdin/stdout directly (Node.js handles encoding correctly)
process.stdin.pipe(python.stdin);
python.stdout.pipe(process.stdout);

// Handle process termination
python.on("exit", (code) => {
  process.exit(code || 0);
});

process.on("SIGINT", () => {
  python.kill("SIGINT");
});

process.on("SIGTERM", () => {
  python.kill("SIGTERM");
});
