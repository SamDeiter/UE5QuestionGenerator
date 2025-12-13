#!/usr/bin/env python3
"""
Test if stdio_server() produces any output during creation.
We'll create the context but immediately exit.
"""
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

server = Server("test")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return []

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    return [types.TextContent(type="text", text="test")]

async def main():
    sys.stderr.write("About to create stdio_server...\n")
    async with stdio_server() as (read_stream, write_stream):
        sys.stderr.write("stdio_server created successfully\n")
        sys.stderr.write("Exiting immediately (not calling server.run)\n")
    sys.stderr.write("stdio_server context exited\n")

if __name__ == "__main__":
    asyncio.run(main())
    sys.stderr.write("Test complete\n")
