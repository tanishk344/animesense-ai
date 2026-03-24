import os

js_dir = "c:\\Users\\Lenovo\\Desktop\\Antigravity\\AI ANIME ASSITENT\\js"
api_dir = "c:\\Users\\Lenovo\\Desktop\\Antigravity\\AI ANIME ASSITENT\\api"

dirs_to_clean = [js_dir, api_dir]

for d in dirs_to_clean:
    if os.path.exists(d):
        for f in os.listdir(d):
            if f.endswith('.js'):
                path = os.path.join(d, f)
                with open(path, 'r', encoding='utf-8') as file:
                    lines = file.readlines()
                
                new_lines = []
                for line in lines:
                    # preserve the original console.log redefinition in chat.js
                    if "const _originalLog = console.log;" in line or "console.log = function" in line:
                        new_lines.append(line)
                        continue
                    
                    if "console.log" in line:
                        continue
                        
                    new_lines.append(line)
                    
                with open(path, 'w', encoding='utf-8') as file:
                    file.writelines(new_lines)
print("Finished stripping console.logs")
