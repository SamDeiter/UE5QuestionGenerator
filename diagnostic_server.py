#!/usr/bin/env python3
"""
Diagnostic MCP server that logs all stdio communication.
This will help us see exactly what's being sent/received.
"""
import asyncio
import sys
import json
from datetime import datetime

if sys.platform == "win32":
    # CRITICAL FIX: Set stdout to binary mode to prevent CRLF line ending issues
    import msvcrt
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Create a log file to capture all communication
log_file = open("C:\\Users\\Sam Deiter\\Documents\\GitHub\\UE5QuestionGenerator\\mcp_debug.log", "w", encoding="utf-8")

def log(message):
    """Log to file with timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")
    log_file.write(f"[{timestamp}] {message}\n")
    log_file.flush()

log("=== MCP Diagnostic Server Starting ===")
log(f"Python version: {sys.version}")
log(f"Platform: {sys.platform}")

# Now import MCP after logging is set up
from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

log("MCP imports successful")

server = Server("diagnostic-test")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    log("list_tools() called")
    return []

@server.call_tool()
async def call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    log(f"call_tool() called: {name}")
    return [types.TextContent(type="text", text=f"Unknown tool: {name}")]

async def main():
    log("Entering main()")
    try:
        log("Creating stdio_server context")
        async with stdio_server() as (read_stream, write_stream):
            log("stdio_server created successfully")
            log("Starting server.run()")
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options(),
            )
            log("server.run() completed")
    except Exception as e:
        log(f"Exception in main(): {type(e).__name__}: {e}")
        import traceback
        log(traceback.format_exc())
        raise

if __name__ == "__main__":
    log("__main__ starting")
    try:
        asyncio.run(main())
        log("asyncio.run(main()) completed normally")
    except Exception as e:
        log(f"Exception in __main__: {type(e).__name__}: {e}")
        sys.stderr.write(f"Server Crash: {e}\n")
        import traceback
        traceback.print_exc(file=sys.stderr)
    finally:
        log("=== MCP Diagnostic Server Exiting ===")
        log_file.close()
