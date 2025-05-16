@echo off
echo DirectGHLoader Plugin-Dateien Installation
echo =========================================
echo.

set RHINO_SCRIPTS_DIR=C:\Users\timkr\AppData\Roaming\McNeel\Rhinoceros\8.0\scripts
set PLUGIN_DIR=%RHINO_SCRIPTS_DIR%\DirectGHLoader

echo Zielverzeichnis: %PLUGIN_DIR%
echo.

if not exist "%RHINO_SCRIPTS_DIR%" (
    echo FEHLER: Das Rhino Scripts-Verzeichnis existiert nicht: %RHINO_SCRIPTS_DIR%
    echo Bitte stellen Sie sicher, dass Rhino installiert ist und das Verzeichnis existiert.
    pause
    exit /b 1
)

if not exist "%PLUGIN_DIR%" (
    echo Erstelle Plugin-Verzeichnis...
    mkdir "%PLUGIN_DIR%"
    echo Verzeichnis erstellt: %PLUGIN_DIR%
) else (
    echo Plugin-Verzeichnis existiert bereits: %PLUGIN_DIR%
)

echo.
echo Kopiere Plugin-Dateien...

copy /Y "%~dp0__init__.py" "%PLUGIN_DIR%\" 
echo __init__.py kopiert.

copy /Y "%~dp0DirectGHLoader.py" "%PLUGIN_DIR%\" 
echo DirectGHLoader.py kopiert.

copy /Y "%~dp0launcher.py" "%PLUGIN_DIR%\" 
echo launcher.py kopiert.

copy /Y "%~dp0__plugin_load__.py" "%PLUGIN_DIR%\" 
echo __plugin_load__.py kopiert.

echo.
echo Installation abgeschlossen!
echo.
echo WICHTIG: Starten Sie Rhino neu, damit das Plugin geladen wird.
echo Sie sollten dann in der Befehlszeile den Befehl "DirectGHLoad" verwenden können.
echo.
echo Um das Plugin manuell zu testen, können Sie in Rhino folgendes eingeben:
echo _-RunPythonScript "%PLUGIN_DIR%\DirectGHLoader.py"
echo.

pause
