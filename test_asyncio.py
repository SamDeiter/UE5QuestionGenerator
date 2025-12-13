"""Simple asyncio test to check if the issue is with asyncio itself."""
import asyncio
import sys

async def test():
    print("Asyncio is working!", file=sys.stderr)
    return "SUCCESS"

if __name__ == "__main__":
    try:
        result = asyncio.run(test())
        print(f"Result: {result}", file=sys.stderr)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
