import io
import sys
import contextlib

buf = io.StringIO()

with contextlib.redirect_stdout(buf):
    # IMPORTANT: Do not run the server, just import the module.
    import optimized_performance_server

captured = buf.getvalue()

sys.stderr.write("Captured stdout from ue5-guardian module import:\n")
sys.stderr.write(repr(captured) + "\n")
