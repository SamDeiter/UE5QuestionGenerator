import os

def find_keywords_in_file(directory, keywords):
    for root, dirs, files in os.walk(directory):
        if '.git' in dirs:
            dirs.remove('.git')
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
            
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if all(kw in content for kw in keywords):
                        print(f"Keywords {keywords} found in {path}")

find_keywords_in_file('c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/src', ['current', 'total', 'message'])
