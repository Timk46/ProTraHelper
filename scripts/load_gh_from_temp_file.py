import rhinoscriptsyntax as rs
import os
import time # Keep for potential future use with explicit Grasshopper loading

def read_gh_path_from_temp_file(temp_file_for_path):
    """
    Reads the .gh file path from a specified temporary file.
    Deletes the temporary file after reading.
    """
    try:
        if os.path.exists(temp_file_for_path):
            with open(temp_file_for_path, 'r') as f:
                gh_path = f.read().strip()
            
            try:
                os.remove(temp_file_for_path)
                rs.StatusBarProgressMeterShow("Temp path file deleted: " + temp_file_for_path, 0, 100, True, True) # Rhino status bar
                print("Temp path file deleted: " + temp_file_for_path)
            except Exception as e:
                rs.StatusBarProgressMeterShow("Error deleting temp path file: " + str(e), 0, 100, True, True)
                print("Error deleting temp path file: " + str(e))
            return gh_path
        else:
            rs.StatusBarProgressMeterShow("Temp path file not found: " + temp_file_for_path, 0, 100, True, True)
            print("Temp path file not found: " + temp_file_for_path)
            return None
    except Exception as e:
        rs.StatusBarProgressMeterShow("Error reading temp path file: " + str(e), 0, 100, True, True)
        print("Error reading temp path file: " + str(e))
        return None

def main():
    """
    Main function to load and play a Grasshopper file specified in a temp file.
    """
    rs.StatusBarProgressMeterShow("Python script 'load_gh_from_temp_file.py' started.", 0, 100, True, True)
    print("Python script 'load_gh_from_temp_file.py' started.")
    
    # Define the path to the temporary file that stores the .gh file path.
    # This path MUST match the one used in the calling PowerShell script.
    temp_file_containing_gh_path = os.path.join(os.getenv('TEMP', 'C:\\temp'), 'rhino_gh_path.txt')
    rs.StatusBarProgressMeterShow("Expecting .gh path in: " + temp_file_containing_gh_path, 0, 100, True, True)
    print("Expecting .gh path in: " + temp_file_containing_gh_path)

    gh_file_to_load = read_gh_path_from_temp_file(temp_file_containing_gh_path)

    if gh_file_to_load and os.path.exists(gh_file_to_load):
        rs.StatusBarProgressMeterShow("Path to .gh file found: " + gh_file_to_load, 0, 100, True, True)
        print("Path to .gh file found: " + gh_file_to_load)
        
        # Use _GrasshopperPlayer to load the .gh file.
        # The hyphen prefix attempts to suppress dialogs.
        # The _Enter at the end confirms the command.
        command_player = "_-GrasshopperPlayer \"" + gh_file_to_load + "\" _Enter"
        
        rs.StatusBarProgressMeterShow("Executing in Rhino: " + command_player, 0, 100, True, True)
        print("Executing in Rhino: " + command_player)
        
        # Execute the command. 
        # The 'False' argument means the script doesn't wait for the command to complete.
        rs.Command(command_player, False) 
        
        rs.StatusBarProgressMeterShow(".gh file loading process initiated.", 0, 100, True, True)
        print(".gh file loading process initiated.")
    elif gh_file_to_load:
        error_msg_file_not_exist = "Error: .gh file path found but file does not exist: " + gh_file_to_load
        rs.StatusBarProgressMeterShow(error_msg_file_not_exist, 0, 100, True, True)
        print(error_msg_file_not_exist)
        rs.MessageBox("Der angegebene Grasshopper-Dateipfad wurde nicht gefunden:\n" + gh_file_to_load, 0, "Fehler im Python-Skript (Datei nicht existent)")
    else:
        error_msg_temp_file_issue = "Error: Could not read .gh file path from temp file or temp file not found."
        rs.StatusBarProgressMeterShow(error_msg_temp_file_issue, 0, 100, True, True)
        print(error_msg_temp_file_issue)
        rs.MessageBox("Konnte den Pfad zur Grasshopper-Datei nicht aus der temporären Datei lesen oder die Datei wurde nicht gefunden.", 0, "Fehler im Python-Skript (Temp-Datei Problem)")
    
    rs.StatusBarProgressMeterHide()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Log any unexpected error during main execution
        print("Unhandled exception in main(): " + str(e))
        rs.MessageBox("Ein unerwarteter Fehler ist im Python-Skript aufgetreten:\n" + str(e), 0, "Schwerwiegender Fehler im Python-Skript")
