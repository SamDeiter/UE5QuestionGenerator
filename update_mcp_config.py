import json

config_path = r"C:\Users\Sam Deiter\.gemini\antigravity\mcp_config.json"

# Read the current config
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Update the command to use the venv Python
config['mcpServers']['ue5-guardian']['command'] = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\.venv\Scripts\python.exe"

# Write back
with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2)

print("✓ Updated mcp_config.json to use venv Python interpreter")
