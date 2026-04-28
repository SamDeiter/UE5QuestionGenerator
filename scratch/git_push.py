import subprocess, sys

cwd = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator'

# Note: git commit already happened, so we just need to push and deploy if push failed or continue
# But to be safe, let's just make sure we push and then deploy properly.

def run_cmd(cmd):
    # Use shell=True for Windows to find npm/git in PATH
    print(f"Running: {' '.join(cmd)}")
    # Explicitly using cmd /c for shell commands as per user global rules
    full_cmd = ["cmd", "/c"] + cmd
    return subprocess.run(full_cmd, cwd=cwd)

# Try pushing again just in case the previous one didn't finish completely
run_cmd(['git', 'push', 'origin', 'main'])

print('Deploying...')
r = run_cmd(['npm', 'run', 'deploy'])
print('Deploy exit code:', r.returncode)
sys.exit(r.returncode)
