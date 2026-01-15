import os
import re

def find_icons():
    icon_pattern = re.compile(r'<Icon\s+name=["\']([^"\']+)["\']')
    unique_icons = set()
    
    src_dir = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src"
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.jsx', '.js')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = icon_pattern.findall(content)
                        unique_icons.update(matches)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
                    
    return sorted(list(unique_icons))

if __name__ == "__main__":
    icons = find_icons()
    print("UNIQUE_ICONS_START")
    for icon in icons:
        print(icon)
    print("UNIQUE_ICONS_END")
