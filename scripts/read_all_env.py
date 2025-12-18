import os

def read_env_files():
    env_files = ['.env.development', '.env.local', '.env']
    for file in env_files:
        path = os.path.join(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator', file)
        if os.path.exists(path):
            print(f"--- {file} ---")
            with open(path, 'r') as f:
                content = f.read()
                print(content)

if __name__ == "__main__":
    read_env_files()
