# Migration zu ARCHSTUDENT Rolle

## Übersicht

Diese Migration fügt eine neue Rolle `ARCHSTUDENT` hinzu und migriert bestehende Studenten mit Architektur-Fächern von der Rolle `STUDENT` zu `ARCHSTUDENT`.

## 🎯 Ziel

Vereinfachung der Frontend-Logik für das Helper-App Onboarding durch direkte Rolle-basierte Prüfung statt komplexer Subject-Array-Durchsuchung.

## 📋 Durchgeführte Änderungen

### 1. Schema-Updates
- ✅ `shared/dtos/roles.enum.ts`: Neue Rolle `ARCHSTUDENT` hinzugefügt
- ✅ `server_nestjs/prisma/schema.prisma`: GlobalRole Enum erweitert
- ✅ Prisma Migration generiert: `add-archstudent-role`

### 2. Migration Script
- ✅ `server_nestjs/prisma/migrate-to-archstudent.ts`: Vollständiges Migrations-Script
- ✅ `server_nestjs/package.json`: NPM Script `migrate:archstudent` hinzugefügt

### 3. Frontend-Updates
- ✅ Helper App Onboarding Service: Von Subject-basiert zu Rolle-basiert migriert
- ✅ Dashboard-Integration: Kommentare aktualisiert
- ✅ README: Dokumentation auf neue Logik angepasst

## 🚀 Ausführung der Migration

### Schritt 1: Vorschau (Dry Run)
```bash
cd server_nestjs
npm run migrate:archstudent dry-run
```

**Was passiert:**
- Zeigt alle Studenten an, die migriert würden
- **Keine tatsächlichen Änderungen** an der Datenbank
- Listet erkannte Architektur-Fächer auf

### Schritt 2: Migration ausführen
```bash
cd server_nestjs
npm run migrate:archstudent migrate
```

**Was passiert:**
- Alle Studenten mit Architektur-Fächern werden zu `ARCHSTUDENT` migriert
- Detailliertes Logging der Änderungen
- Verifikation der Ergebnisse

### Schritt 3: Rollback (falls nötig)
```bash
cd server_nestjs
npm run migrate:archstudent rollback
```

**Was passiert:**
- Alle `ARCHSTUDENT` User werden zurück zu `STUDENT` migriert
- Nur für Notfälle verwenden

## 📊 Erkannte Architektur-Fächer

Das Script erkennt folgende Fächer als Architektur-bezogen:

```typescript
const ARCHITECTURE_SUBJECTS = [
  'Architektur',
  'Städtebau',
  'Gebäudeplanung',
  'CAD',
  'Parametric Design',
  'Computational Design',
  'BIM',
  'Digital Architecture',
  'Architectural Design',
  'Urban Planning',
  'Building Design',
  'Rhino',
  'Grasshopper'
];
```

Die Erkennung erfolgt **case-insensitive** und mit **partieller Übereinstimmung**.

## 🔍 Verifikation nach Migration

### 1. Datenbankprüfung
```sql
-- Anzahl ARCHSTUDENT User
SELECT COUNT(*) FROM "User" WHERE "globalRole" = 'ARCHSTUDENT';

-- Details der migrierten User
SELECT id, email, firstname, lastname, "globalRole" 
FROM "User" 
WHERE "globalRole" = 'ARCHSTUDENT';
```

### 2. Frontend-Test
1. Mit ARCHSTUDENT-User einloggen
2. Dashboard besuchen
3. Helper-App Onboarding Dialog sollte erscheinen

### 3. Onboarding Reset (für Testing)
```javascript
// Browser Console
localStorage.removeItem('protra_helper_onboarding_completed');
localStorage.removeItem('protra_helper_onboarding_skipped');
// Page refresh → Dialog erscheint wieder
```

## 🛡️ Sicherheitsaspekte

### Vor der Migration
- [ ] **Backup der Datenbank** erstellen
- [ ] **Staging-Umgebung** testen
- [ ] **Rollback-Plan** bereithalten

### Validierung
- Script prüft nur User mit `registeredForSL: true`
- Nur User mit Rolle `STUDENT` werden betrachtet
- Transaktionale Sicherheit durch Prisma

### Monitoring
- Alle Änderungen werden geloggt
- Fehler werden erfasst und berichtet
- Verifikation nach Migration

## 📈 Erwartete Ergebnisse

### Performance-Verbesserung
- **Vorher**: O(n) Array-Durchsuchung pro Login
- **Nachher**: O(1) direkte Rolle-Prüfung

### Code-Vereinfachung
- **Entfernt**: ~50 Zeilen Subject-Logik
- **Hinzugefügt**: 1 einfache Rolle-Prüfung
- **Wartbarkeit**: Deutlich verbessert

### Benutzererfahrung
- Identisches Verhalten für Enduser
- Schnellere Entscheidung beim Login
- Zuverlässigere Onboarding-Anzeige

## 🔧 Troubleshooting

### Migration schlägt fehl
```bash
# Prisma Schema regenerieren
npx prisma generate

# Datenbank-Verbindung prüfen
npx prisma db pull
```

### Onboarding funktioniert nicht
1. **User-Rolle prüfen**:
   ```sql
   SELECT "globalRole" FROM "User" WHERE email = 'user@example.com';
   ```

2. **JWT Token prüfen**:
   ```javascript
   // Browser Console
   const token = localStorage.getItem('accessToken');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Role:', decoded.globalRole);
   ```

3. **LocalStorage reset**:
   ```javascript
   localStorage.clear();
   ```

### Rollback erforderlich
```bash
npm run migrate:archstudent rollback
```

## 📝 Weitere Anpassungen

### Neue Architektur-Fächer hinzufügen
1. `migrate-to-archstudent.ts` → `ARCHITECTURE_SUBJECTS` erweitern
2. Erneut dry-run und migration ausführen

### Weitere spezialisierte Rollen
```typescript
// schema.prisma
enum GlobalRole {
  STUDENT
  TEACHER  
  ADMIN
  ARCHSTUDENT
  ENGINEERINGSTUDENT  // Neue Rolle
}
```

## ✅ Checkliste

### Vor Produktion
- [ ] Backup erstellt
- [ ] Staging getestet
- [ ] Dry-run ausgeführt
- [ ] Frontend-Changes deployed
- [ ] Monitoring vorbereitet

### Nach Migration
- [ ] Verifikation durchgeführt
- [ ] Frontend-Tests bestanden
- [ ] User-Feedback eingeholt
- [ ] Performance-Monitoring

### Rollback-Bereitschaft
- [ ] Rollback-Script getestet
- [ ] Backup verfügbar
- [ ] Team informiert

---

**Status**: ✅ Bereit für Ausführung  
**Getestet**: Frontend-Integration, Script-Syntax  
**Risiko**: Niedrig (transaktional, mit Rollback)  
**Ausfallzeit**: Keine (Hot-Migration möglich)
