# Code-Signing Setup für ProTra Helper App

## Übersicht

| Plattform | Lösung | Kosten |
|-----------|--------|--------|
| Windows | SignPath Foundation (OSS-Programm) | Kostenlos |
| macOS | Apple Developer Program | $99/Jahr |

---

## Teil 1: Helper App in eigenes öffentliches Repo auslagern

Dies ist Voraussetzung für SignPath Foundation (Windows Code-Signing).

### Schritt 1: Neues GitHub-Repo erstellen

1. Auf GitHub: **New Repository** → z.B. `protra-helper`
2. **Visibility:** Public (Pflicht für SignPath)
3. **License:** MIT (oder andere OSI-kompatible Lizenz)
4. Repo klonen:
   ```bash
   git clone https://github.com/SvenJacobsUni/protra-helper.git
   cd protra-helper
   ```

### Schritt 2: Code kopieren

```bash
# Aus dem HEFL-Hauptrepo den Helper-App-Ordner kopieren
cp -r /pfad/zu/hefl/protra-helper-app/* .
cp -r /pfad/zu/hefl/protra-helper-app/.* . 2>/dev/null  # versteckte Dateien

# Workflow-Datei an die richtige Stelle
mkdir -p .github/workflows
cp /pfad/zu/hefl/.github/workflows/build-helper-app.yml .github/workflows/
```

### Schritt 3: Workflow anpassen

In `.github/workflows/build-helper-app.yml` den `defaults`-Block entfernen, da der Code jetzt im Root liegt:

```yaml
# ENTFERNEN:
defaults:
  run:
    working-directory: protra-helper-app

# Und alle "cache-dependency-path" anpassen:
# ALT:  cache-dependency-path: protra-helper-app/package-lock.json
# NEU:  cache-dependency-path: package-lock.json

# Und Artifact-Pfade anpassen:
# ALT:  path: protra-helper-app/dist/*.exe
# NEU:  path: dist/*.exe
```

### Schritt 4: Lizenz hinzufügen

`LICENSE` Datei im Root mit MIT-Lizenz erstellen:

```
MIT License

Copyright (c) 2025 HEFL-Entwicklungsteam

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Schritt 5: Push & Verify

```bash
git add .
git commit -m "Initial commit: ProTra Helper App"
git push origin main
```

Prüfen: GitHub Actions Build läuft erfolgreich durch.

### Schritt 6: Im HEFL-Hauptrepo aufräumen

```bash
# Im HEFL-Repo: protra-helper-app/ entfernen
cd /pfad/zu/hefl
git rm -r protra-helper-app/
git rm .github/workflows/build-helper-app.yml
git commit -m "Move ProTra Helper App to dedicated public repository"
```

Optional: In `README.md` oder `CLAUDE.md` einen Verweis auf das neue Repo ergänzen.

---

## Teil 2: Windows Code-Signing mit SignPath Foundation

### Schritt 1: Bei SignPath Foundation bewerben

1. Auf [signpath.org](https://signpath.org/) gehen
2. "Apply" / Bewerbungsformular ausfüllen:
   - GitHub-Repo-URL angeben
   - Projektbeschreibung (Helper App für Rhino/Grasshopper-Integration in Lernplattform)
   - Team-Mitglieder auflisten
3. Bearbeitungszeit: typischerweise einige Tage

### Schritt 2: Voraussetzungen erfüllen

- [ ] Öffentliches GitHub-Repo mit OSI-Lizenz
- [ ] MFA (2FA) für alle Team-Mitglieder auf GitHub aktiviert
- [ ] MFA auf SignPath.io aktiviert (nach Annahme)
- [ ] Code-Signing-Policy im Repo veröffentlichen (z.B. in README.md):

```markdown
## Code Signing Policy

This program is signed using a certificate issued by [SignPath Foundation](https://signpath.org/).

- Free code signing provided by [SignPath.io](https://signpath.io/),
  certificate issued by [SignPath Foundation](https://signpath.org/)
- The signing process verifies that binaries originate from this repository's CI/CD pipeline
```

### Schritt 3: GitHub Actions Integration

Nach Annahme durch SignPath: Workflow um SignPath-Schritt erweitern.

```yaml
# Am Ende des build-windows Jobs hinzufügen:
      - name: Sign with SignPath
        uses: SignPath/github-action-submit-signing-request@v1
        with:
          api-token: '${{ secrets.SIGNPATH_API_TOKEN }}'
          organization-id: '<von SignPath bereitgestellt>'
          project-slug: 'protra-helper'
          signing-policy-slug: 'release-signing'
          artifact-configuration-slug: 'windows-exe'
          github-artifact-id: '<artifact-id>'
          wait-for-completion: true
          output-artifact-directory: 'dist/signed'

      - name: Upload signed artifact
        uses: actions/upload-artifact@v4
        with:
          name: ProTra-Helfer-Windows-Signed
          path: dist/signed/*.exe
```

### Schritt 4: package.json anpassen

```json
// In "build" > "win":
// ENTFERNEN:
"sign": null

// Der Build erstellt die EXE, SignPath signiert sie nachträglich
```

---

## Teil 3: macOS Code-Signing mit Apple Developer Program

> **Kosten:** $99/Jahr — keine kostenlose Alternative verfügbar.
> Apple akzeptiert ausschließlich eigene Zertifikate (Developer ID).
> Ohne Apple Developer Program bleibt nur der Workaround: User muss Rechtsklick → "Öffnen" nutzen.

### Schritt 1: Apple Developer Account

1. [developer.apple.com/programs](https://developer.apple.com/programs/) → "Enroll"
2. Als **Organisation** registrieren (mit D-U-N-S Nummer) oder als **Einzelperson**
3. Uni-Account möglich: Fachbereich/Institut als Organisation
4. Nach Verifizierung ($99 zahlen): Zugang zum Developer Portal

### Schritt 2: Zertifikat erstellen

1. Im [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list) → "+" → "Developer ID Application"
2. CSR (Certificate Signing Request) erstellen:
   ```bash
   # Auf einem Mac:
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout developer_id.key -out developer_id.csr \
     -subj "/CN=ProTra Helper/O=HEFL-Entwicklungsteam"
   ```
3. CSR hochladen → Zertifikat herunterladen (.cer)
4. Zertifikat + Key in .p12 exportieren:
   ```bash
   # .cer in .pem umwandeln
   openssl x509 -in developer_id_application.cer -inform DER -out developer_id.pem
   # .p12 erstellen (mit Passwort!)
   openssl pkcs12 -export -out developer_id.p12 \
     -inkey developer_id.key -in developer_id.pem \
     -password pass:DEIN_SICHERES_PASSWORT
   ```

### Schritt 3: GitHub Secrets einrichten

```bash
# .p12 als Base64 kodieren
base64 -i developer_id.p12 | pbcopy
```

Im GitHub-Repo → Settings → Secrets:
- `CSC_LINK`: Base64-kodiertes .p12 Zertifikat
- `CSC_KEY_PASSWORD`: Passwort des .p12
- `APPLE_ID`: Apple-ID E-Mail
- `APPLE_APP_SPECIFIC_PASSWORD`: App-spezifisches Passwort (erstellen unter appleid.apple.com → Sicherheit)
- `APPLE_TEAM_ID`: Team-ID aus dem Developer Portal

### Schritt 4: Workflow anpassen (macOS Job)

```yaml
  build-macos:
    name: Build macOS Installer
    needs: test
    runs-on: macos-latest
    timeout-minutes: 30
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build macOS DMG (signed + notarized)
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: npx electron-builder --mac --x64 --arm64 --publish=never

      - name: Upload macOS artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ProTra-Helfer-macOS
          path: dist/*.dmg
          retention-days: 30
```

### Schritt 5: package.json anpassen

```json
// In "build" > "mac":
// ÄNDERN:
"identity": null        →  ENTFERNEN (electron-builder findet das Zertifikat automatisch)
"gatekeeperAssess": false  →  "gatekeeperAssess": true

// Notarization hinzufügen (in "build"):
"afterSign": "scripts/notarize.js"
```

### Schritt 6: Notarize-Script erstellen

Datei `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: 'com.hefl.protra.helperapp',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

```bash
npm install --save-dev @electron/notarize
```

---

## Sofort-Maßnahme (solange kein Signing vorhanden)

Im Onboarding-Dialog Hinweise einbauen:

**Windows:**
> Windows zeigt möglicherweise eine Sicherheitswarnung an.
> Klicken Sie auf **"Weitere Informationen"** → **"Trotzdem ausführen"**.

**macOS:**
> macOS blockiert möglicherweise die Installation.
> **Rechtsklick** auf die App → **"Öffnen"** → im Dialog **"Öffnen"** bestätigen.

---

## Checkliste

- [ ] Neues öffentliches Repo erstellt
- [ ] Code + Workflow kopiert und angepasst
- [ ] MIT-Lizenz hinzugefügt
- [ ] Build läuft im neuen Repo
- [ ] SignPath Foundation Bewerbung eingereicht
- [ ] (Optional) Apple Developer Account registriert
- [ ] Code-Signing-Policy im Repo veröffentlicht
- [ ] Onboarding-Dialog mit Sicherheitshinweisen aktualisiert
