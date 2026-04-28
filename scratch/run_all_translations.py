import subprocess
import time
import os

languages = [
    "Korean", 
    "Spanish", 
    "French", 
    "German", 
    "Italian", 
    "Portuguese", 
    "Russian"
]

project_root = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator'
script_path = os.path.join(project_root, 'scripts', 'cloud_translate_bulk.py')

# We'll run them one by one to be safe with rate limits and Firestore throughput,
# but we'll automate the whole sequence.
# Each language takes ~2-3 minutes. Total ~15-20 mins.

print(f"Starting bulk translation for: {', '.join(languages)}")

for lang in languages:
    print(f"\n>>> Starting {lang}...")
    try:
        # We don't set GOOGLE_APPLICATION_CREDENTIALS here because we confirmed 
        # that the system ADC works better with the current setup.
        result = subprocess.run(
            ['python', script_path, '--lang', lang],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(f"Errors/Warnings for {lang}:\n{result.stderr}")
    except Exception as e:
        print(f"Failed to run translation for {lang}: {e}")

print("\nAll translations completed!")
