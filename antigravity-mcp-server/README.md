# Antigravity MCP Server

A TypeScript-based MCP (Model Context Protocol) server designed for Google Antigravity IDE productivity. Provides tools for browsing files, reading contents, searching the workspace, and running npm scripts.

## Features

### 🔧 Tools

1. **echo** - Connectivity testing
   - Echo back text to verify the MCP connection is working

2. **list_files** - Browse repository files
   - List files and directories in the workspace
   - Breadth-first traversal with configurable limits
   - Returns both human-readable and structured output

3. **read_file** - Read file contents
   - Read text files from the workspace
   - Configurable byte limits with truncation support
   - Safe handling of missing or non-file paths

4. **search_workspace** - Search across files
   - Uses `ripgrep` (rg) if available, falls back to `grep`
   - Plain text search (not regex)
   - Optional glob patterns for file filtering
   - Returns file paths, line numbers, and preview text

5. **run_npm_script** - Execute npm scripts
   - Run any npm script defined in package.json
   - Pass additional arguments
   - Configurable timeout and output limits
   - Captures both stdout and stderr

### 🔒 Workspace Sandboxing

All file operations are sandboxed to `WORKSPACE_ROOT`:

- Set via `WORKSPACE_ROOT` environment variable
- Defaults to `process.cwd()` if not set
- All paths are resolved and validated to prevent directory traversal attacks
- Attempts to escape the workspace root are blocked

## Installation

```bash
npm install
```

## Usage

### Development Mode

Run the server directly with TypeScript:

```bash
npm run dev
```

### Production Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

### Type Checking

Verify TypeScript types without building:

```bash
npm run typecheck
```

## Configuration for Antigravity

Add this server to your Antigravity MCP configuration file (typically `mcp_config.json` or similar):

```json
{
  "mcpServers": {
    "antigravity-dev-helper": {
      "command": "npx",
      "args": ["-y", "tsx", "src/server.ts"],
      "env": {
        "NODE_ENV": "production",
        "WORKSPACE_ROOT": "/absolute/path/to/your/repo"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/repo` with the actual absolute path to your workspace.

Alternatively, if you've built the project:

```json
{
  "mcpServers": {
    "antigravity-dev-helper": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "WORKSPACE_ROOT": "/absolute/path/to/your/repo"
      }
    }
  }
}
```

## Tool Reference

### echo

Test MCP connectivity by echoing text back.

**Input:**

```json
{
  "text": "Hello, MCP!"
}
```

**Output:**

```json
{
  "text": "Hello, MCP!"
}
```

### list_files

List files and directories in the workspace.

**Input:**

```json
{
  "directory": "src",
  "maxEntries": 100
}
```

**Parameters:**

- `directory` (string, default: "."): Directory relative to WORKSPACE_ROOT
- `maxEntries` (number, 1-2000, default: 200): Maximum entries to return

**Output:**

```json
{
  "entries": [
    { "path": "src/server.ts", "type": "file" },
    { "path": "src/utils", "type": "directory" }
  ]
}
```

### read_file

Read a text file from the workspace.

**Input:**

```json
{
  "path": "package.json",
  "maxBytes": 100000
}
```

**Parameters:**

- `path` (string, required): File path relative to WORKSPACE_ROOT
- `maxBytes` (number, 1-500000, default: 100000): Maximum bytes to read

**Output:**

```json
{
  "path": "package.json",
  "truncated": false,
  "content": "{\n  \"name\": \"...\"\n}"
}
```

### search_workspace

Search for text across files in the workspace.

**Input:**

```json
{
  "query": "TODO",
  "directory": "src",
  "glob": "**/*.ts",
  "maxResults": 50
}
```

**Parameters:**

- `query` (string, required): Plain text to search for
- `directory` (string, default: "."): Directory to search in
- `glob` (string, default: ""): Optional glob pattern (ripgrep only)
- `maxResults` (number, 1-500, default: 100): Maximum results to return

**Output:**

```json
{
  "matches": [
    {
      "file": "src/server.ts",
      "line": 42,
      "preview": "// TODO: Add error handling"
    }
  ]
}
```

### run_npm_script

Execute an npm script from package.json.

**Input:**

```json
{
  "script": "build",
  "args": ["--watch"],
  "timeoutSeconds": 60,
  "maxOutputBytes": 100000
}
```

**Parameters:**

- `script` (string, required): npm script name (e.g., "build", "test")
- `args` (string[], default: []): Additional arguments to pass
- `timeoutSeconds` (number, 1-1800, default: 300): Timeout in seconds
- `maxOutputBytes` (number, 1000-2000000, default: 200000): Max output buffer

**Output:**

```json
{
  "script": "build",
  "exitCode": 0,
  "timedOut": false,
  "stdout": "Build completed successfully",
  "stderr": ""
}
```

## Architecture

- **Language**: TypeScript with strict type checking
- **Runtime**: Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.x
- **Transport**: StdioServerTransport (stdio-based communication)
- **Validation**: Zod schemas for all tool inputs

## Security

- All file operations are sandboxed to `WORKSPACE_ROOT`
- Path traversal attempts are blocked
- No arbitrary command execution (only npm scripts)
- Output limits prevent memory exhaustion
- Timeouts prevent runaway processes

## Logging

The server logs to **stderr** only to avoid corrupting MCP messages on stdout. Look for:

- Startup messages with WORKSPACE_ROOT path
- Error messages for debugging

## Troubleshooting

### "Resolved path escapes WORKSPACE_ROOT"

This error means a tool tried to access a file outside the workspace. Check that:

1. `WORKSPACE_ROOT` is set correctly
2. The path you're requesting is relative to the workspace
3. There are no `..` segments that escape the workspace

### Search returns no results

If `search_workspace` returns no results:

1. Check that `ripgrep` (rg) or `grep` is installed
2. Verify the query string is correct
3. Try searching from the root directory (".")
4. Check file permissions in the workspace

### npm script fails

If `run_npm_script` fails:

1. Verify the script exists in package.json
2. Check that npm is installed and in PATH
3. Ensure WORKSPACE_ROOT contains a package.json
4. Review the stderr output for error details

## License

MIT
