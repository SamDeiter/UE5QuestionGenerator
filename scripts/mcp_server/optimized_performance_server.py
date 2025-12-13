#!/usr/bin/env python3
"""
UE5 Guardian MCP Server - Batch Wrapper Compatible
Works with mcp_wrapper.bat for Windows compatibility
"""
import sys
import os

# Suppress stderr only (batch file handles stdio encoding)
sys.stderr = open(os.devnull, 'w')

import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

server = Server("ue5-guardian")

# Configuration
MAX_LINES_RETURNED = 100
LARGE_FILE_THRESHOLD = 25_000

BLOCKLIST_DIRS = {
    "node_modules", ".git", ".firebase", ".agent", "dist", "build", "coverage",
    ".gemini", ".husky", ".url-crawler", ".github", "__pycache__", ".venv",
    "temp_scorm_extract", "temp_scorm12_extract"
}

BINARY_EXTENSIONS = {
    ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".ico", ".gif", ".svg",
    ".db", ".sqlite", ".pyc", ".zip", ".tar", ".gz",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webm", ".webp"
}

def _smart_read_file(file_path: str) -> str:
    if not os.path.exists(file_path):
        return f"Error: File not found at {file_path}"
    
    _, ext = os.path.splitext(file_path)
    if ext.lower() in BINARY_EXTENSIONS:
        return f"STOP: {file_path} is a binary file ({ext})."
    
    parts = file_path.split(os.sep)
    if any(part in BLOCKLIST_DIRS for part in parts):
        return f"STOP: Access to {file_path} is blocked (Ignored Directory)."
    
    try:
        file_size = os.path.getsize(file_path)
        if file_size > LARGE_FILE_THRESHOLD:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                total_lines = len(lines)
                if total_lines <= MAX_LINES_RETURNED:
                    return "".join(lines)
                half = MAX_LINES_RETURNED // 2
                return (
                    f"--- SMART VIEW: File is large ({total_lines} lines). ---\n"
                    f"--- Showing first {half} and last {half} lines. ---\n\n"
                    f"{''.join(lines[:half])}\n"
                    f"\n... [Skipped {total_lines - MAX_LINES_RETURNED} lines] ...\n\n"
                    f"{''.join(lines[-half:])}"
                )
        
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def _smart_list_directory(path: str = ".") -> str:
    if not os.path.exists(path):
        return "Path not found."
    output = []
    try:
        with os.scandir(path) as entries:
            for entry in entries:
                if entry.is_dir() and entry.name in BLOCKLIST_DIRS:
                    output.append(f"[DIR]  {entry.name}/ (SKIPPED)")
                    continue
                _, ext = os.path.splitext(entry.name)
                if ext.lower() in BINARY_EXTENSIONS:
                    output.append(f"[FILE] {entry.name} (BINARY)")
                elif entry.is_dir():
                    output.append(f"[DIR]  {entry.name}/")
                else:
                    output.append(f"[FILE] {entry.name}")
        return "\n".join(sorted(output))
    except Exception as e:
        return f"Error listing directory: {str(e)}"

def _smart_log_tail(log_path: str, lines_to_read: int = 50) -> str:
    if lines_to_read > MAX_LINES_RETURNED:
        lines_to_read = MAX_LINES_RETURNED
    if not os.path.exists(log_path):
        return "Log file not found."
    try:
        with open(log_path, "rb") as f:
            f.seek(0, os.SEEK_END)
            buffer = bytearray()
            pointer = f.tell()
            while pointer > 0 and buffer.count(b"\n") < lines_to_read + 1:
                chunk_size = 1024 if pointer > 1024 else pointer
                pointer -= chunk_size
                f.seek(pointer)
                chunk = f.read(chunk_size)
                buffer = chunk + buffer
            text = buffer.decode("utf-8", errors="replace")
            return "\n".join(text.splitlines()[-lines_to_read:])
    except Exception as e:
        return f"Error: {str(e)}"

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="smart_read_file",
            description="Safely reads a file. Blocks binaries and summarizes large files.",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to the file"}
                },
                "required": ["file_path"],
            },
        ),
        types.Tool(
            name="smart_list_directory",
            description="Lists files in a directory, ignoring heavy folders.",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path (default: .)"}
                },
            },
        ),
        types.Tool(
            name="smart_log_tail",
            description="Reads the last N lines of a log file.",
            inputSchema={
                "type": "object",
                "properties": {
                    "log_path": {"type": "string", "description": "Path to the log file"},
                    "lines_to_read": {"type": "integer", "description": "Number of lines (default: 50)"},
                },
                "required": ["log_path"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    if not arguments:
        arguments = {}
    
    try:
        if name == "smart_read_file":
            result = _smart_read_file(arguments.get("file_path", ""))
            return [types.TextContent(type="text", text=result)]
        
        if name == "smart_list_directory":
            result = _smart_list_directory(arguments.get("path", "."))
            return [types.TextContent(type="text", text=result)]
        
        if name == "smart_log_tail":
            result = _smart_log_tail(
                arguments.get("log_path", ""),
                arguments.get("lines_to_read", 50),
            )
            return [types.TextContent(type="text", text=result)]
        
        raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        return [types.TextContent(type="text", text=f"Tool Error: {str(e)}")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception:
        pass