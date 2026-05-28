"""
Configure Firebase Cloud Functions with the Gemini API key.

Uses `firebase functions:secrets:set` which writes to Google Secret
Manager and exposes the value to deployed functions as a runtime secret.
The previous `firebase functions:config:set` path is deprecated as of
Firebase Functions v3.18 — the new secrets API supports rotation,
versioning, and IAM, and is the only supported option going forward.

Usage:
    python scripts/setup_cloud_functions.py <GEMINI_API_KEY>

The Cloud Function code must declare the secret in its handler, e.g.:

    exports.generateQuestions = functions
      .runWith({ secrets: ["GEMINI_API_KEY"] })
      .https.onCall(async (data, context) => {
        const key = process.env.GEMINI_API_KEY;
        ...
      });
"""
import subprocess
import sys


SECRET_NAME = "GEMINI_API_KEY"
PROJECT = "ue5-questions-prod"


def set_firebase_secret(api_key: str) -> None:
    """Set the Gemini API key as a Firebase Functions secret."""
    print("=" * 60)
    print("🔐 Configuring Firebase Cloud Functions secret")
    print("=" * 60)

    # `firebase functions:secrets:set GEMINI_API_KEY` reads the value from
    # stdin. We pipe the key in so it never lands in argv (which would
    # be visible to `ps`).
    cmd = [
        "firebase",
        "functions:secrets:set",
        SECRET_NAME,
        "--project",
        PROJECT,
        "--data-file",
        "-",  # read value from stdin
    ]

    print(f"\n📤 Setting {SECRET_NAME} in Cloud Functions secrets...")
    print(f"   Command: {' '.join(cmd[:3])} (value from stdin)")

    try:
        result = subprocess.run(
            cmd,
            input=api_key,
            capture_output=True,
            text=True,
            check=True,
        )

        print("\n✅ Secret set successfully!")
        print(result.stdout)

        print("\n" + "=" * 60)
        print("📋 Next Steps:")
        print("=" * 60)
        print("1. Make sure each function that needs the secret declares it:")
        print('   functions.runWith({ secrets: ["GEMINI_API_KEY"] })')
        print()
        print("2. Re-deploy the Cloud Functions to bind the new secret value:")
        print(f"   firebase deploy --only functions --project {PROJECT}")
        print()
        print("3. The deployed functions read the value via process.env.GEMINI_API_KEY")
        print("=" * 60)

    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error: {e.stderr}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/setup_cloud_functions.py <GEMINI_API_KEY>")
        sys.exit(1)

    api_key = sys.argv[1].strip()
    set_firebase_secret(api_key)
