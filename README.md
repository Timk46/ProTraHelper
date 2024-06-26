
# HEFL Webapp
Willkommen in unserem Gitlab Repository für Code und Projektmanagement :)
### Wichtige Links:
1. [Starter-Guide](https://ddi-projektgruppe.de/) - Hatte ich für meine Projektgruppe erstellt. Passwort: projektgruppe2023

2. [Angular-Guide](https://www.udemy.com/course/the-complete-guide-to-angular-2/) - Angular Kurs bei Udemy, welchen Marc und ich uns zugelegt haben

3. [Weiterführend](https://thefullstack.engineer/tag/full-stack-development-series/) - Als Monorepo mit NX inkl. CICD etc. pp.

### Vorschlag Workflow:

 - Terminal in VS Code splitten
 - Terminal 1 in den Client-Unterordner: `cd client_angular` & Terminal 2 in den Server-Unterordner: `cd server_nestjs`
 - (nur beim ersten Einrichten oder wenn eine neue Libary hinzugefügt wurde: jeweils `npm install`)
 - Start client_angular: `ng serve` & Start server_nestjs: `npm start`

 ## Code Reviews
- Änderungen auf den Branches Main und Stable sind nur über Pull Requests möglich
- Pull Requests müssen von mindestens von zwei Personen genehmigt werden, bevor sie gemerged werden können
- Main bleibt der aktive Entwicklungsbranch, Stable ist der aktuelle Stand der Anwendung

### Dokumentation:

 - Für die Dokumentation nutzen wir [Compodoc](https://compodoc.app/). Dieses habe ich bereits für Server und Client eingerichtet. 
 - **Wichtig ist eigentlich nur, dass innerhalb ihr innerhalb des Programmcodes nach [diesen Regeln](https://compodoc.app/guides/jsdoc-tags.html) dokumentiert.** Dies hat außerdem den Vorteil, dass wenn man über einen Funktionsaufruf hovert, deren Dokumentation direkt sieht. 
 - Ich habe bereits zwei kleine Beispiele zur Demonstration eingebaut. Die Dokumentation kann für Server und Client jeweils mit dem Befehl `npm run compodoc` automatisch erzeugt werden.
