import subprocess, sys

cwd = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator'

def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    full_cmd = ["cmd", "/c"] + cmd
    return subprocess.run(full_cmd, cwd=cwd)

# 1. Stage changes
print("Staging changes...")
run_cmd(['git', 'add', 'src/AuthenticatedApp.jsx', 'src/components/QuestionItem.jsx'])

# 2. Commit
print("Committing...")
commit_msg = "fix: resolve production TDZ error via lazy loading and fix sonarjs unused import"
run_cmd(['git', 'commit', '-m', commit_msg])

# 3. Deploy
print('Deploying to GitHub Pages...')
r = run_cmd(['npm', 'run', 'deploy'])

if r.returncode == 0:
    print('✅ Deployment Successful!')
    # 4. Push to origin
    run_cmd(['git', 'push', 'origin', 'main'])
else:
    print('❌ Deployment Failed!')
    sys.exit(r.returncode)
