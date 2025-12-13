import io
import sys
import contextlib

buf = io.StringIO()

# Capture *only* stdout for the duration of the imports
with contextlib.redirect_stdout(buf):
    import mcp.server
    import mcp.types
    from mcp.server.stdio import stdio_server

captured = buf.getvalue()

# Show what (if anything) got printed, but to STDERR so we don't confuse tools
sys.stderr.write("Captured stdout from MCP imports:\n")
sys.stderr.write(repr(captured) + "\n")
