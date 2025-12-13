"""
Test script to verify the MCP server responds correctly to JSON-RPC messages.
This simulates what the MCP client does during initialization.
"""
import subprocess
import json
import sys

def test_mcp_server():
    """Test the MCP server by sending an initialize request."""
    
    # Start the server process
    server_path = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\optimized_performance_server.py"
    python_exe = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\.venv\Scripts\python.exe"
    
    print("Starting MCP server...", file=sys.stderr)
    
    process = subprocess.Popen(
        [python_exe, server_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8',
        env={"PYTHONUTF8": "1"}
    )
    
    # Send an initialize request (JSON-RPC 2.0)
    initialize_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }
    
    request_str = json.dumps(initialize_request) + "\n"
    print(f"Sending request: {request_str.strip()}", file=sys.stderr)
    
    try:
        # Send the request
        process.stdin.write(request_str)
        process.stdin.flush()
        
        # Read the response (with timeout)
        import time
        start = time.time()
        response_line = ""
        
        while time.time() - start < 5:  # 5 second timeout
            if process.stdout.readable():
                char = process.stdout.read(1)
                if not char:
                    break
                response_line += char
                if char == '\n':
                    break
        
        print(f"\nResponse received: {response_line.strip()}", file=sys.stderr)
        
        # Try to parse as JSON
        if response_line.strip():
            try:
                response_json = json.loads(response_line)
                print(f"\n✓ Valid JSON-RPC response!", file=sys.stderr)
                print(f"Response: {json.dumps(response_json, indent=2)}", file=sys.stderr)
                return True
            except json.JSONDecodeError as e:
                print(f"\n✗ Invalid JSON response: {e}", file=sys.stderr)
                print(f"Raw response: {repr(response_line)}", file=sys.stderr)
                return False
        else:
            print(f"\n✗ No response received", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"\n✗ Error during test: {e}", file=sys.stderr)
        return False
    finally:
        # Check stderr for any errors
        stderr_output = process.stderr.read()
        if stderr_output:
            print(f"\nServer stderr output:\n{stderr_output}", file=sys.stderr)
        
        process.terminate()
        process.wait(timeout=2)

if __name__ == "__main__":
    success = test_mcp_server()
    sys.exit(0 if success else 1)
