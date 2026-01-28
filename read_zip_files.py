import zipfile
import os

zip_path = r'C:\Users\Sam Deiter\Downloads\UE5_Scenario_SCORM12_Working_Template_File.zip'

if os.path.exists(zip_path):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        if 'index.html' in zip_ref.namelist():
            print("\n--- index.html ---")
            print(zip_ref.read('index.html').decode('utf-8'))
        
        if 'scorm.js' in zip_ref.namelist():
            print("\n--- scorm.js ---")
            print(zip_ref.read('scorm.js').decode('utf-8'))
else:
    print(f"File not found: {zip_path}")
