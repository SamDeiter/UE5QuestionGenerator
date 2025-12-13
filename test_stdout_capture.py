#!/usr/bin/env python3
"""
Test to capture ALL stdout output during MCP server initialization.
This will help us find exactly what's contaminating the stream.
"""
import sys
import io
import os

# Capture stdout BEFORE any other imports
original_stdout = sys.stdout
captured = io.StringIO()
sys.stdout = captured

try:
    # Now do all the imports and initialization
    import asyncio
    import traceback
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    import mcp.types as types
    
    server = Server("capture-test")
    
    @server.list_tools()
    async def handle_list_tools() -> list[types.Tool]:
        return []
    
    @server.call_tool()
    async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]
    
    # Restore stdout
    sys.stdout = original_stdout
    
    # Write what we captured to stderr
    output = captured.getvalue()
    sys.stderr.write("=== CAPTURED STDOUT DURING INITIALIZATION ===\n")
    sys.stderr.write(f"Length: {len(output)} bytes\n")
    sys.stderr.write(f"Repr: {repr(output)}\n")
    sys.stderr.write("=== END CAPTURED OUTPUT ===\n")
    
    if output:
        sys.stderr.write("\nFOUND STDOUT CONTAMINATION!\n")
        sys.stderr.write("This is what's causing the 'invalid trailing data' error.\n")
    else:
        sys.stderr.write("\nNo stdout output detected during imports.\n")
        sys.stderr.write("The issue must be happening during asyncio.run() or stdio_server creation.\n")
    
except Exception as e:
    sys.stdout = original_stdout
    sys.stderr.write(f"Error during capture test: {e}\n")
    import traceback
    traceback.print_exc(file=sys.stderr)
