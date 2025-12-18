import os

def read_env_files():
    env_files = ['.env', '.env.local', '.env.development', '.env.production']
    for file in env_files:
        path = os.path.join(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator', file)
        if os.path.exists(path):
            print(f"--- {file} ---")
            with open(path, 'r') as f:
                for line in f:
                    if 'ADMIN' in line or 'EMAIL' in line:
                        print(line.strip())

if __name__ == "__main__":
    read_env_files()
