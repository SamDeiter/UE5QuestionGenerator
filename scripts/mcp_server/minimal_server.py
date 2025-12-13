import asyncio
import os
import sys
import traceback

from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

# ----------------------------------------------------------------------
# Minimal MCP server with aggressive stdout hardening
# ----------------------------------------------------------------------

server = Server("minimal-test")


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """
    MCP client calls this to discover tools.
    We return an empty list for this minimal test.
    """
    return []


@server.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict | None,
) -> list[types.TextContent]:
    """
    Should never be called (no tools), but stays here to satisfy the API.
    """
    return [
        types.TextContent(
            type="text",
            text=f"Unknown tool: {name}",
        )
    ]


async def main() -> None:
    """
    Entry point for the MCP stdio server.

    1. stdio_server() wires real stdin/stdout to a pair of asyncio streams.
    2. AFTER that, we redirect sys.stdout to /dev/null so any stray prints
       from our code or 3rd-party libraries cannot corrupt the MCP stream.
    """
    async with stdio_server() as (read_stream, write_stream):
        # At this point, stdio_server has created a writer bound to the
        # real stdout. We can now safely neuter sys.stdout so any accidental
        # print() calls go into the void instead of the MCP pipe.
        try:
            sys.stdout = open(os.devnull, "w", buffering=1, encoding="utf-8")
        except Exception:
            # Even if this fails, we still have a working server; it just
            # means stray prints could still leak.
            pass

        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    try:
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(
                asyncio.WindowsSelectorEventLoopPolicy()
            )

        asyncio.run(main())
    except Exception as e:
        # All diagnostics go to STDERR – never stdout.
        sys.stderr.write(f"Server Crash: {e}\n")
        traceback.print_exc(file=sys.stderr)
