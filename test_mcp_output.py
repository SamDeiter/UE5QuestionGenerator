#!/usr/bin/env python3
"""
Test script to capture any stdout output during MCP server initialization.
This will help us identify what's contaminating the JSON-RPC stream.
"""
import sys
import io

# Capture stdout
original_stdout = sys.stdout
captured_output = io.StringIO()
sys.stdout = captured_output

try:
    # Import and run the server setup (but not the main loop)
    import asyncio
    import os
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    import mcp.types as types
    
    # Initialize server
    server = Server("ue5-guardian")
    
    # Restore stdout
    sys.stdout = original_stdout
    
    # Print what was captured
    output = captured_output.getvalue()
    if output:
        print("=== CAPTURED STDOUT OUTPUT ===", file=sys.stderr)
        print(repr(output), file=sys.stderr)
        print("=== END CAPTURED OUTPUT ===", file=sys.stderr)
    else:
        print("No stdout output detected during imports and server init.", file=sys.stderr)
        
except Exception as e:
    sys.stdout = original_stdout
    print(f"Error during test: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
