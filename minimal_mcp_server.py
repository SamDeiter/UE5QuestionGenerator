#!/usr/bin/env python3
import sys
import os

# Redirect stderr BEFORE any imports
sys.stderr = open(os.devnull, 'w')

# Set binary mode BEFORE any imports
if sys.platform == "win32":
    import msvcrt
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)

# Now run the actual server
if __name__ == "__main__":
    import asyncio
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    import mcp.types as types
    
    server = Server("ue5-guardian")
    
    @server.list_tools()
    async def list_tools():
        return [
            types.Tool(
                name="read_file",
                description="Read a text file",
                inputSchema={
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"]
                }
            )
        ]
    
    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        if name == "read_file":
            try:
                with open(arguments["path"], "r", encoding="utf-8") as f:
                    return [types.TextContent(type="text", text=f.read())]
            except Exception as e:
                return [types.TextContent(type="text", text=f"Error: {e}")]
        return [types.TextContent(type="text", text="Unknown tool")]
    
    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    
    try:
        asyncio.run(main())
    except:
        pass
