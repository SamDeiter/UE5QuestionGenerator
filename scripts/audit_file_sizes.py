import os

def list_large_files(start_path='src', count=30):
    files = []
    for dirpath, dirnames, filenames in os.walk(start_path):
        for f in filenames:
            if f.endswith(('.js', '.jsx')):
                fp = os.path.join(dirpath, f)
                files.append((os.path.getsize(fp), fp))
    
    files.sort(key=lambda x: x[0], reverse=True)
    
    print(f"{'Size (Bytes)':<15} {'Path'}")
    print("-" * 60)
    for size, path in files[:count]:
        print(f"{size:<15} {path}")

if __name__ == "__main__":
    list_large_files()
