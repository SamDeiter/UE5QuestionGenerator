import zipfile
import os

zip_path = r'C:\Users\Sam Deiter\Downloads\UE5_Scenario_SCORM12_Working_Template_File.zip'

if os.path.exists(zip_path):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        print(f"Contents of {zip_path}:")
        for file in zip_ref.namelist():
            print(f" - {file}")
        
        # Read the manifest if it exists
        if 'imsmanifest.xml' in zip_ref.namelist():
            print("\n--- imsmanifest.xml ---")
            print(zip_ref.read('imsmanifest.xml').decode('utf-8'))
else:
    print(f"File not found: {zip_path}")
