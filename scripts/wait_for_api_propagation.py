"""
Test Firebase connection and verify API key is working.
"""
import time


def countdown_timer(seconds: int) -> None:
    """Display a countdown timer."""
    print(f"\n⏳ Waiting {seconds} seconds for API key propagation...")
    print("   (Google Cloud changes can take up to 5 minutes)")
    
    for remaining in range(seconds, 0, -1):
        mins, secs = divmod(remaining, 60)
        timer = f"{mins:02d}:{secs:02d}"
        print(f"\r   Time remaining: {timer}", end="", flush=True)
        time.sleep(1)
    
    print("\r   ✅ Wait complete!                    ")


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 Firebase API Key Propagation Timer")
    print("=" * 60)
    
    countdown_timer(120)  # 2 minutes
    
    print("\n" + "=" * 60)
    print("📋 Next Steps:")
    print("=" * 60)
    print("1. Hard refresh your browser (Ctrl+Shift+R)")
    print("2. Check the browser console for errors")
    print("3. If errors persist, wait another 2-3 minutes")
    print("=" * 60)
