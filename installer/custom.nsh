; ProTra Helfer - Custom NSIS Installation Script
; Erweiterte Installer-Funktionalität für professionelle Installation

; Include modern UI
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "WinVer.nsh"

; Registry keys für URL Handler
!define REG_UNINSTALL "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
!define REG_PROTRA_HELPER "Software\HEFL\ProTra-Helper"

; Custom pages
Var IsUpgrade
Var OldVersion

; Installation function
Function .onInit
    ; Check if running on supported Windows version
    ${IfNot} ${AtLeastWin10}
        MessageBox MB_OK|MB_ICONSTOP "ProTra Helfer erfordert Windows 10 oder höher."
        Quit
    ${EndIf}
    
    ; Check for existing installation
    ReadRegStr $0 HKCU "${REG_UNINSTALL}" "UninstallString"
    ${If} $0 != ""
        StrCpy $IsUpgrade "true"
        ReadRegStr $OldVersion HKCU "${REG_UNINSTALL}" "DisplayVersion"
        MessageBox MB_YESNO|MB_ICONQUESTION "ProTra Helfer $OldVersion ist bereits installiert.$\n$\nMöchten Sie die Installation aktualisieren?" IDYES upgrade IDNO quit
        upgrade:
            ; Uninstall old version silently
            ExecWait '"$0" /S'
            Goto continue
        quit:
            Quit
    ${Else}
        StrCpy $IsUpgrade "false"
    ${EndIf}
    
    continue:
FunctionEnd

; Custom installation function
Function InstallProTraHelper
    ; Create application registry entries
    WriteRegStr HKCU "${REG_PROTRA_HELPER}" "InstallPath" "$INSTDIR"
    WriteRegStr HKCU "${REG_PROTRA_HELPER}" "Version" "${VERSION}"
    WriteRegStr HKCU "${REG_PROTRA_HELPER}" "InstallDate" "$%date%"
    
    ; Register URL protocol handler for rhinogh://
    WriteRegStr HKCU "Software\Classes\rhinogh" "" "URL:Rhino Grasshopper Protocol"
    WriteRegStr HKCU "Software\Classes\rhinogh" "URL Protocol" ""
    WriteRegStr HKCU "Software\Classes\rhinogh\DefaultIcon" "" "$INSTDIR\${PRODUCT_FILENAME}.exe,0"
    WriteRegStr HKCU "Software\Classes\rhinogh\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
    
    ; Register .gh file association (optional)
    WriteRegStr HKCU "Software\Classes\.gh\OpenWithProgids" "ProTraHelper.ghfile" ""
    WriteRegStr HKCU "Software\Classes\ProTraHelper.ghfile" "" "Grasshopper Definition"
    WriteRegStr HKCU "Software\Classes\ProTraHelper.ghfile\DefaultIcon" "" "$INSTDIR\${PRODUCT_FILENAME}.exe,0"
    WriteRegStr HKCU "Software\Classes\ProTraHelper.ghfile\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
    
    ; Add to startup (optional, with user consent)
    MessageBox MB_YESNO|MB_ICONQUESTION "Möchten Sie ProTra Helfer automatisch beim Systemstart ausführen?$\n$\n(Empfohlen für optimale Funktionalität)" IDYES addstartup IDNO skipstartup
    addstartup:
        WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ProTraHelper" '"$INSTDIR\${PRODUCT_FILENAME}.exe" --startup'
        Goto continue_install
    skipstartup:
        ; Remove startup entry if it exists
        DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ProTraHelper"
    
    continue_install:
    
    ; Create Windows Firewall exception
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ProTra Helper" dir=in action=allow program="$INSTDIR\${PRODUCT_FILENAME}.exe" enable=yes'
    
    ; Create uninstaller with proper registry entries
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "${REG_UNINSTALL}" "DisplayName" "ProTra Helfer"
    WriteRegStr HKCU "${REG_UNINSTALL}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKCU "${REG_UNINSTALL}" "Publisher" "HEFL-Entwicklungsteam"
    WriteRegStr HKCU "${REG_UNINSTALL}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "${REG_UNINSTALL}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${REG_UNINSTALL}" "DisplayIcon" "$INSTDIR\${PRODUCT_FILENAME}.exe,0"
    WriteRegStr HKCU "${REG_UNINSTALL}" "HelpLink" "https://protra.hefl.de/support"
    WriteRegStr HKCU "${REG_UNINSTALL}" "URLInfoAbout" "https://protra.hefl.de"
    WriteRegDWORD HKCU "${REG_UNINSTALL}" "NoModify" 1
    WriteRegDWORD HKCU "${REG_UNINSTALL}" "NoRepair" 1
    
    ; Calculate and write install size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKCU "${REG_UNINSTALL}" "EstimatedSize" "$0"
FunctionEnd

; Post-installation function
Function .onInstSuccess
    ; Show completion message
    ${If} $IsUpgrade == "true"
        MessageBox MB_OK|MB_ICONINFORMATION "ProTra Helfer wurde erfolgreich auf Version ${VERSION} aktualisiert!"
    ${Else}
        MessageBox MB_OK|MB_ICONINFORMATION "ProTra Helfer wurde erfolgreich installiert!$\n$\nDie Anwendung startet jetzt — Sie finden das Rhino-Symbol in der Taskleiste (unten rechts, ggf. im Überlaufbereich).$\n$\nBeim ersten Start erscheint ein Einrichtungsfenster."
    ${EndIf}
FunctionEnd

; Uninstaller functions
Function un.onInit
    MessageBox MB_YESNO|MB_ICONQUESTION "Sind Sie sicher, dass Sie ProTra Helfer vollständig entfernen möchten?" IDYES continue IDNO quit
    continue:
    Return
    quit:
    Quit
FunctionEnd

Function un.UninstallProTraHelper
    ; Stop running application
    nsExec::ExecToLog 'taskkill /F /IM "${PRODUCT_FILENAME}.exe" /T'
    
    ; Remove startup entry
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ProTraHelper"
    
    ; Remove URL protocol handler
    DeleteRegKey HKCU "Software\Classes\rhinogh"
    
    ; Remove file associations
    DeleteRegKey HKCU "Software\Classes\.gh\OpenWithProgids"
    DeleteRegKey HKCU "Software\Classes\ProTraHelper.ghfile"
    
    ; Remove application registry entries
    DeleteRegKey HKCU "${REG_PROTRA_HELPER}"
    DeleteRegKey HKCU "${REG_UNINSTALL}"
    
    ; Remove Windows Firewall exception
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ProTra Helper"'
    
    ; Remove installation directory
    RMDir /r "$INSTDIR"
    
    ; Remove desktop shortcut
    Delete "$DESKTOP\ProTra Helfer.lnk"
    
    ; Remove start menu entries
    RMDir /r "$SMPROGRAMS\ProTra Tools"
FunctionEnd

Function un.onUninstSuccess
    MessageBox MB_OK|MB_ICONINFORMATION "ProTra Helfer wurde erfolgreich entfernt."
FunctionEnd

; Custom section for main installation
Section "ProTra Helfer Core" SecCore
    SectionIn RO ; Required section
    Call InstallProTraHelper
SectionEnd

; Custom section for desktop integration
Section "Desktop Integration" SecDesktop
    ; This section is handled by the main NSIS configuration
SectionEnd

; Section descriptions
LangString DESC_SecCore ${LANG_GERMAN} "Hauptanwendung ProTra Helfer (erforderlich)"
LangString DESC_SecDesktop ${LANG_GERMAN} "Desktop-Verknüpfungen und Startmenü-Einträge"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
