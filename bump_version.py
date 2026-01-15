import json
import os

package_path = 'c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/package.json'

with open(package_path, 'r') as f:
    data = json.load(f)

version_parts = data['version'].split('.')
version_parts[-1] = str(int(version_parts[-1]) + 1)
data['version'] = '.'.join(version_parts)

with open(package_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Bumped version to {data['version']}")
