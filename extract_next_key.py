import json

def main():
    with open('configg.json', 'r') as f:
        data = json.load(f)
    
    # Angenommen, das relevante Projekt ist 'C:/Dev/hefl'
    project_key = 'C:/Dev/hefl'
    if project_key not in data['projects']:
        print(f"Projekt {project_key} nicht gefunden.")
        return
    
    project = data['projects'][project_key]
    keys = list(project.keys())
    if 'history' not in keys:
        print("Key 'history' nicht gefunden.")
        return
    
    history_index = keys.index('history')
    if history_index + 1 >= len(keys):
        print("Kein nächster Key nach 'history'.")
        return
    
    next_key = keys[history_index + 1]
    print(f"Der nächste Key nach 'history' ist: {next_key}")

if __name__ == "__main__":
    main() 