import sys  
file_path = r'src\hooks\useExport.js'  
f = open(file_path, 'r', encoding='utf-8')  
content = f.read()  
f.close()  
old_text = 'status: \" "accepted\, // Assume DB questions are accepted'  
