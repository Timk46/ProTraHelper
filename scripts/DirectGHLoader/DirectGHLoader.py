# -*- coding: utf-8 -*-
# DirectGHLoader.py - ULTRA-MINIMALE VERSION
# Nur für direktes Laden einer GH-Datei bei manuellem Test

import rhinoscriptsyntax as rs
import os

# Eine Funktion - GH Player aufrufen - das ist alles
def load_gh_file(file_path):
    if os.path.exists(file_path) and file_path.lower().endswith('.gh'):
        print("Lade Grasshopper-Datei: " + file_path)
        command = "_-GrasshopperPlayer \"{}\" _Enter".format(file_path)
        rs.Command(command)
        return True
    
    print("Ungültige Datei: " + str(file_path))
    return False

# Skript ausführen
if __name__ == "__main__":
    # Dateiauswahl-Dialog anzeigen (nur für manuellen Test)
    filter = "Grasshopper-Dateien (*.gh)|*.gh|Alle Dateien (*.*)|*.*||"
    path = rs.OpenFileName("Grasshopper-Datei öffnen", filter)
    if path:
        load_gh_file(path)
    else:
        print("Keine Datei ausgewählt.")
