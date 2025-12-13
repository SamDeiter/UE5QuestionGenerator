#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Workspace sandboxing
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

function resolveWorkspacePath(relativePath: string): string {
  const joined = path.resolve(WORKSPACE_ROOT, relativePath);
  if (!joined.startsWith(WORKSPACE_ROOT)) {
    throw new Error(
      `Resolved path escapes WORKSPACE_ROOT – blocked for safety: ${relativePath}`
    );
  }
  return joined;
}

// Tool schemas
const EchoSchema = z.object({
  text: z.string(),
});

const ListFilesSchema = z.object({
  directory: z.string().default("."),
  maxEntries: z.number().min(1).max(2000).default(200),
});

const ReadFileSchema = z.object({
  path: z.string(),
  maxBytes: z.number().min(1).max(500000).default(100000),
});

const SearchWorkspaceSchema = z.object({
  query: z.string().min(1),
  directory: z.string().default("."),
  glob: z.string().default(""),
  maxResults: z.number().min(1).max(500).default(100),
});

const RunNpmScriptSchema = z.object({
  script: z.string().min(1),
  args: z.array(z.string()).default([]),
  timeoutSeconds: z.number().min(1).max(1800).default(300),
  maxOutputBytes: z.number().min(1000).max(2000000).default(200000),
});

// Tool definitions
const tools: Tool[] = [
  {
    name: "echo",
    description: "Echo back the provided text for connectivity testing",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to echo back",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "list_files",
    description:
      "List files and directories under a given directory in the workspace",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Directory relative to WORKSPACE_ROOT. Defaults to '.'",
          default: ".",
        },
        maxEntries: {
          type: "number",
          description: "Maximum number of entries to return (1-2000)",
          default: 200,
          minimum: 1,
          maximum: 2000,
        },
      },
    },
  },
  {
    name: "read_file",
    description: "Read a single text file from the workspace",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to WORKSPACE_ROOT, e.g. 'src/index.ts'",
        },
        maxBytes: {
          type: "number",
          description: "Maximum bytes to read (1-500000)",
          default: 100000,
          minimum: 1,
          maximum: 500000,
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_workspace",
    description:
      "Search across files using ripgrep (rg) if available, otherwise grep",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Plain text search query (not regex)",
          minLength: 1,
        },
        directory: {
          type: "string",
          description: "Directory to search in, relative to WORKSPACE_ROOT",
          default: ".",
        },
        glob: {
          type: "string",
          description: "Optional glob pattern like '**/*.ts' (for ripgrep)",
          default: "",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (1-500)",
          default: 100,
          minimum: 1,
          maximum: 500,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "run_npm_script",
    description: "Run an npm script in WORKSPACE_ROOT",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "npm script name, e.g. 'build', 'test', 'lint'",
          minLength: 1,
        },
        args: {
          type: "array",
          description: "Extra arguments to pass to the script",
          items: { type: "string" },
          default: [],
        },
        timeoutSeconds: {
          type: "number",
          description: "Timeout in seconds (1-1800)",
          default: 300,
          minimum: 1,
          maximum: 1800,
        },
        maxOutputBytes: {
          type: "number",
          description: "Maximum output buffer size (1000-2000000)",
          default: 200000,
          minimum: 1000,
          maximum: 2000000,
        },
      },
      required: ["script"],
    },
  },
];

// Tool handlers
async function handleEcho(args: z.infer<typeof EchoSchema>) {
  return {
    content: [{ type: "text" as const, text: args.text }],
    structuredContent: { text: args.text },
  };
}

async function handleListFiles(args: z.infer<typeof ListFilesSchema>) {
  const dirPath = resolveWorkspacePath(args.directory);
  const entries: { path: string; type: "file" | "directory" }[] = [];
  const queue: string[] = [dirPath];
  let count = 0;

  while (queue.length > 0 && count < args.maxEntries) {
    const currentDir = queue.shift()!;

    try {
      const items = await fs.readdir(currentDir, { withFileTypes: true });

      for (const item of items) {
        if (count >= args.maxEntries) break;

        const fullPath = path.join(currentDir, item.name);
        const relativePath = path.relative(WORKSPACE_ROOT, fullPath);

        entries.push({
          path: relativePath,
          type: item.isDirectory() ? "directory" : "file",
        });
        count++;

        if (item.isDirectory() && count < args.maxEntries) {
          queue.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
      console.error(`Cannot read directory ${currentDir}:`, err, {
        stream: "stderr",
      });
    }
  }

  const textOutput = entries
    .map((e) => `${e.type === "directory" ? "📁" : "📄"} ${e.path}`)
    .join("\n");

  return {
    content: [
      {
        type: "text" as const,
        text: textOutput || "No entries found",
      },
    ],
    structuredContent: { entries },
  };
}

async function handleReadFile(args: z.infer<typeof ReadFileSchema>) {
  const filePath = resolveWorkspacePath(args.path);

  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Path is not a file: ${args.path}`,
          },
        ],
        structuredContent: {
          path: args.path,
          truncated: false,
          content: "",
        },
      };
    }

    const buffer = await fs.readFile(filePath);
    let content = buffer.toString("utf-8");
    let truncated = false;

    if (buffer.length > args.maxBytes) {
      content = buffer.subarray(0, args.maxBytes).toString("utf-8");
      truncated = true;
    }

    const label = truncated
      ? `File ${args.path} (truncated to ${args.maxBytes} bytes):`
      : `File ${args.path}:`;

    return {
      content: [
        {
          type: "text" as const,
          text: `${label}\n\n${content}`,
        },
      ],
      structuredContent: {
        path: args.path,
        truncated,
        content,
      },
    };
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return {
        content: [
          {
            type: "text" as const,
            text: `File not found: ${args.path}`,
          },
        ],
        structuredContent: {
          path: args.path,
          truncated: false,
          content: "",
        },
      };
    }
    throw err;
  }
}

async function handleSearchWorkspace(
  args: z.infer<typeof SearchWorkspaceSchema>
) {
  const dirPath = resolveWorkspacePath(args.directory);

  // Detect search tool
  let tool = "grep";
  try {
    await execAsync("command -v rg", { shell: "/bin/bash" });
    tool = "rg";
  } catch {
    // rg not available, use grep
  }

  let cmd: string;
  if (tool === "rg") {
    const globArg = args.glob ? `-g '${args.glob.replace(/'/g, "'\\''")}'` : "";
    cmd = `rg --vimgrep --no-heading --max-count ${args.maxResults} ${globArg} -- '${args.query.replace(/'/g, "'\\''")}' .`;
  } else {
    cmd = `grep -R -n -- '${args.query.replace(/'/g, "'\\''")}' . | head -n ${args.maxResults}`;
  }

  try {
    const { stdout } = await execAsync(cmd, {
      cwd: dirPath,
      maxBuffer: 5 * 1024 * 1024, // 5MB
    });

    const matches: { file: string; line: number; preview: string }[] = [];

    for (const line of stdout.trim().split("\n")) {
      if (!line) continue;

      if (tool === "rg") {
        // Format: file:line:col:match
        const match = line.match(/^([^:]+):(\d+):\d+:(.*)$/);
        if (match) {
          const [, file, lineNum, preview] = match;
          const relativePath = path.relative(WORKSPACE_ROOT, path.resolve(dirPath, file));
          matches.push({
            file: relativePath,
            line: parseInt(lineNum, 10),
            preview: preview.trim(),
          });
        }
      } else {
        // Format: file:line:match
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          const [, file, lineNum, preview] = match;
          const relativePath = path.relative(WORKSPACE_ROOT, path.resolve(dirPath, file));
          matches.push({
            file: relativePath,
            line: parseInt(lineNum, 10),
            preview: preview.trim(),
          });
        }
      }
    }

    const textOutput =
      matches.length > 0
        ? matches
            .map((m) => `${m.file}:${m.line}: ${m.preview}`)
            .join("\n")
        : "No matches found.";

    return {
      content: [{ type: "text" as const, text: textOutput }],
      structuredContent: { matches },
    };
  } catch (err: unknown) {
    const error = err as { code?: number; stdout?: string; stderr?: string };
    
    // Exit code 1 typically means no matches
    if (error.code === 1) {
      return {
        content: [{ type: "text" as const, text: "No matches found." }],
        structuredContent: { matches: [] },
      };
    }

    // Other errors
    const errorMsg = `Search failed: ${error.stderr || "Unknown error"}`;
    return {
      content: [{ type: "text" as const, text: errorMsg }],
      structuredContent: { matches: [] },
    };
  }
}

async function handleRunNpmScript(args: z.infer<typeof RunNpmScriptSchema>) {
  // Build command with safely quoted args
  const quotedArgs = args.args.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`);
  const argsStr = quotedArgs.length > 0 ? ` -- ${quotedArgs.join(" ")}` : "";
  const cmd = `npm run ${args.script}${argsStr}`;

  let exitCode = 0;
  let timedOut = false;
  let stdout = "";
  let stderr = "";

  try {
    const result = await execAsync(cmd, {
      cwd: WORKSPACE_ROOT,
      timeout: args.timeoutSeconds * 1000,
      maxBuffer: args.maxOutputBytes,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    const error = err as {
      code?: number;
      killed?: boolean;
      stdout?: string;
      stderr?: string;
    };
    
    exitCode = error.code ?? -1;
    timedOut = error.killed === true;
    stdout = error.stdout || "";
    stderr = error.stderr || "";
  }

  // Truncate if needed
  if (stdout.length > args.maxOutputBytes) {
    stdout = stdout.substring(0, args.maxOutputBytes) + "\n[truncated]";
  }
  if (stderr.length > args.maxOutputBytes) {
    stderr = stderr.substring(0, args.maxOutputBytes) + "\n[truncated]";
  }

  const textOutput = [
    `Command: ${cmd}`,
    `Exit code: ${exitCode}`,
    timedOut ? "Status: TIMED OUT" : "",
    "",
    "--- stdout ---",
    stdout || "[no stdout]",
    "",
    "--- stderr ---",
    stderr || "[no stderr]",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    content: [{ type: "text" as const, text: textOutput }],
    structuredContent: {
      script: args.script,
      exitCode,
      timedOut,
      stdout,
      stderr,
    },
  };
}

// Main server
async function main() {
  console.error(`Starting Antigravity MCP Server v2.0.0`);
  console.error(`WORKSPACE_ROOT: ${WORKSPACE_ROOT}`);

  const server = new Server(
    {
      name: "antigravity-dev-helper",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "echo": {
          const validated = EchoSchema.parse(args);
          return await handleEcho(validated);
        }
        case "list_files": {
          const validated = ListFilesSchema.parse(args);
          return await handleListFiles(validated);
        }
        case "read_file": {
          const validated = ReadFileSchema.parse(args);
          return await handleReadFile(validated);
        }
        case "search_workspace": {
          const validated = SearchWorkspaceSchema.parse(args);
          return await handleSearchWorkspace(validated);
        }
        case "run_npm_script": {
          const validated = RunNpmScriptSchema.parse(args);
          return await handleRunNpmScript(validated);
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Antigravity MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
