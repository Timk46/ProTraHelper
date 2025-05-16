# -*- coding: utf-8 -*-
# launcher.py - VERBESSERTE VERSION MIT MEHREREN METHODEN
# 
# Dieses Skript wird aufgerufen, wenn eine rhinogh:// URI aktiviert wird
# Es versucht verschiedene Methoden, um Grasshopper zu starten und die Datei zu laden

import os
import sys
import time
import traceback

# -----------------------------------------------------------------------------
# VERBESSERTES LOGGING - OHNE ABHÄNGIGKEIT VON RHINO API FÜR ZEITSTEMPEL
# -----------------------------------------------------------------------------

def get_log_path():
    """Gibt den Pfad zur Log-Datei zurück"""
    temp_dir = os.environ.get('TEMP', os.environ.get('TMP', 'C:\\Temp'))
    return os.path.join(temp_dir, 'rhinogh_launcher_log.txt')

def log(message):
    """Robustes Logging ohne Abhängigkeit von Rhino-Funktionen für Zeitstempel"""
    try:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        with open(get_log_path(), 'a') as log_file:
            log_file.write("[{}] {}\n".format(timestamp, message))
    except Exception as e:
        # Wenn Logging fehlschlägt, versuchen wir, in ein alternatives Verzeichnis zu schreiben
        try:
            desktop_path = os.path.join(os.path.expanduser('~'), 'Desktop')
            with open(os.path.join(desktop_path, 'rhinogh_error.txt'), 'a') as f:
                f.write("Logging-Fehler: {} - {}\n".format(time.strftime("%Y-%m-%d %H:%M:%S"), str(e)))
                f.write("Ursprüngliche Nachricht: {}\n".format(message))
        except:
            # Wenn auch das fehlschlägt, geben wir auf, um die Hauptfunktion nicht zu beeinträchtigen
            pass

# -----------------------------------------------------------------------------
# VERSCHIEDENE BEFEHLSMETHODEN ZUM ÖFFNEN VON GRASSHOPPER-DATEIEN
# -----------------------------------------------------------------------------

def try_load_grasshopper_file(path, rs, file_exists=True):
    """
    Versucht, eine Grasshopper-Datei mit verschiedenen Methoden zu laden
    
    Args:
        path: Pfad zur .gh-Datei
        rs: rhinoscriptsyntax-Modul
        file_exists: Ob die Datei existiert (True) oder überprüft werden soll (False)
        
    Returns:
        bool: True wenn eine der Methoden funktioniert hat, sonst False
    """
    # Prüfen, ob die Datei existiert - nur wenn gefordert
    if not file_exists:
        if not os.path.exists(path):
            log("FEHLER: Datei existiert nicht: " + path)
            rs.MessageBox("Die angegebene Datei existiert nicht: " + path)
            return False
        
        if not path.lower().endswith('.gh'):
            log("FEHLER: Keine Grasshopper-Datei: " + path)
            rs.MessageBox("Die angegebene Datei ist keine Grasshopper-Datei (.gh): " + path)
            return False
    
    # Führe die Befehle in einer bestimmten Reihenfolge aus
    # und versuche die nächste Methode, wenn die vorherige fehlschlägt
    commands = [
        # Methode 1: GrasshopperPlayer direkt (für Rhino 7/8)
        "_-GrasshopperPlayer \"{}\" _Enter".format(path),
        
        # Methode 2: Befehl mit _Grasshopper und _GrasshopperFile
        "_Grasshopper _GrasshopperFile \"{}\" _Enter".format(path),
        
        # Methode 3: Grasshopper Öffnen-Dialog (für Rhino 7/8)
        "_-Grasshopper _-Open \"{}\" _Enter".format(path),
        
        # Methode 4: Direkter Öffnen-Befehl (für neuere Rhino-Versionen)
        "! _-Open \"{}\" _Enter".format(path),
        
        # Methode 5: GrasshopperLoadDocument (für ältere Versionen)
        "_-GrasshopperLoadDocument \"{}\" _Enter".format(path)
    ]
    
    # Versuche alle Befehle nacheinander
    for i, command in enumerate(commands):
        try:
            log("Versuch {}/5: {}".format(i+1, command))
            rs.Command(command)
            log("Befehl erfolgreich ausgeführt!")
            return True
        except Exception as e:
            log("Befehl fehlgeschlagen: {}".format(str(e)))
            # Fahre mit der nächsten Methode fort
    
    # Wenn keine der Methoden funktioniert, versuche eine alternative Strategie
    try:
        log("Alternative Methode: Starte Grasshopper zuerst und öffne dann die Datei")
        rs.Command("_Grasshopper")
        # Kurze Pause, um Grasshopper Zeit zum Laden zu geben
        time.sleep(1)
        rs.Command("_-Open \"{}\" _Enter".format(path))
        log("Alternative Methode erfolgreich!")
        return True
    except Exception as e:
        log("Alternative Methode fehlgeschlagen: {}".format(str(e)))
        return False

# -----------------------------------------------------------------------------
# HAUPTFUNKTION
# -----------------------------------------------------------------------------

def main():
    """Hauptfunktion - verarbeitet URI-Parameter und versucht, die GH-Datei zu laden"""
    try:
        # Importiere rhinoscriptsyntax erst hier,
        # damit die Logging-Funktionen auch ohne rs funktionieren
        import rhinoscriptsyntax as rs
        
        # Lösche alte Log-Datei, wenn sie zu groß ist
        log_path = get_log_path()
        if os.path.exists(log_path) and os.path.getsize(log_path) > 1000000:  # >1MB
            os.remove(log_path)
        
        # Starte neues Logging
        log("\n\n========== LAUNCHER GESTARTET ==========")
        log("Python-Version: " + sys.version)
        log("Rhino-Version: " + str(rs.ExeVersion()))
        
        # Prüfe, ob der Desktop erreichbar ist (als Test für Schreibzugriff)
        desktop_path = os.path.join(os.path.expanduser('~'), 'Desktop')
        log("Desktop-Pfad: " + desktop_path)
        log("Desktop existiert: " + str(os.path.exists(desktop_path)))
        
        # Liste alle Argumente auf
        log("Argumente: " + str(sys.argv))
        
        # Prüfe, ob URI übergeben wurde
        if len(sys.argv) < 2:
            log("FEHLER: Keine URI übergeben")
            rs.MessageBox("Keine URI übergeben.")
            return
        
        # URI extrahieren und normalisieren
        uri = sys.argv[1]
        log("URI: " + uri)
        
        # Pfad extrahieren und dekodieren
        if uri.startswith("rhinogh://"):
            path = uri.replace("rhinogh://", "")
            
            # URL-Dekodierung
            try:
                import urllib
                if hasattr(urllib, 'unquote'):
                    path = urllib.unquote(path)
                else:
                    # Fallback für neuere Python-Versionen
                    import urllib.parse
                    path = urllib.parse.unquote(path)
            except Exception as e:
                log("Warnung bei URL-Dekodierung: " + str(e))
        else:
            # Annehmen, dass der Parameter bereits ein Dateipfad ist
            path = uri
        
        # Pfad normalisieren
        path = os.path.normpath(path)
        log("Normalisierter Pfad: " + path)
        
        # Prüfen, ob Datei existiert
        log("Datei existiert: " + str(os.path.exists(path)))
        
        # Versuche, die Datei mit verschiedenen Methoden zu laden
        success = try_load_grasshopper_file(path, rs, file_exists=False)
        
        if success:
            log("Erfolg! Mindestens eine Methode hat funktioniert.")
        else:
            log("Fehler: Keine der Methoden hat funktioniert.")
            rs.MessageBox("Konnte Grasshopper-Datei nicht laden: " + path)
        
    except Exception as e:
        # Detaillierte Fehlerbehandlung mit Stack-Trace
        error_msg = "KRITISCHER FEHLER: " + str(e)
        try:
            log(error_msg)
            log(traceback.format_exc())
            
            # Desktop-Benachrichtigung für kritische Fehler
            desktop_path = os.path.join(os.path.expanduser('~'), 'Desktop')
            with open(os.path.join(desktop_path, 'rhinogh_error.txt'), 'w') as f:
                f.write("{}\n{}\n".format(error_msg, traceback.format_exc()))
                
            # Anzeigen in Rhino, wenn möglich
            import rhinoscriptsyntax as rs
            rs.MessageBox("Fehler beim Laden der Grasshopper-Datei: " + str(e) + 
                         "\n\nDetails wurden in die Datei gespeichert:\n" + 
                         os.path.join(desktop_path, 'rhinogh_error.txt'))
        except:
            # Wenn gar nichts funktioniert, versuchen wir, zumindest eine grundlegende
            # Fehlermeldung anzuzeigen, wenn möglich
            try:
                import rhinoscriptsyntax as rs
                rs.MessageBox("Kritischer Fehler beim Laden der Datei")
            except:
                pass

# Direkte Ausführung
if __name__ == "__main__":
    main()
