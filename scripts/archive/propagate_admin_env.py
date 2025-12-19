import os

def propagate_env_var():
    target_var = "VITE_SUPER_ADMIN_EMAIL=sam.deiter@epicgames.com\n"
    env_files = ['.env.development.base', '.env.development', '.env.local', '.env']
    
    for file in env_files:
        path = os.path.join(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator', file)
        if os.path.exists(path):
            with open(path, 'r') as f:
                lines = f.readlines()
            
            # Check if it already exists
            if any("VITE_SUPER_ADMIN_EMAIL" in line for line in lines):
                # Update it
                new_lines = []
                for line in lines:
                    if "VITE_SUPER_ADMIN_EMAIL" in line:
                        new_lines.append(target_var)
                    else:
                        new_lines.append(line)
                with open(path, 'w') as f:
                    f.writelines(new_lines)
                print(f"Updated {file}")
            else:
                # Append it
                if lines and not lines[-1].endswith('\n'):
                    lines[-1] += '\n'
                lines.append(target_var)
                with open(path, 'w') as f:
                    f.writelines(lines)
                print(f"Appended to {file}")
        else:
            print(f"Skipping {file} (not found)")

if __name__ == "__main__":
    propagate_env_var()
