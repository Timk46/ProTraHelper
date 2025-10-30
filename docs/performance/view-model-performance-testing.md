# View Model Performance Testing Guide

> **⚠️ HINWEIS: Zwei Implementierungs-Varianten**
>
> Dieser Leitfaden gilt für **beide Architektur-Ansätze**:
> - **Plan1**: Direkte Observable Grouping → `docs/performance/manual-performance-validation.md`
> - **Plan2**: View Model Services → `docs/performance/manual-performance-validation-plan2.md`
>
> **Für manuelle Validierung** siehe die spezifischen Guides oben.

## 📋 Übersicht

Dieser Leitfaden beschreibt, wie die Performance-Optimierungen des EvaluationDiscussionForumComponent gemessen und validiert werden können.

**Implementiert:** Januar 2025
**Komponente:** `EvaluationDiscussionForumComponent`
**Optimierung:** Semantic Observable Grouping + distinctUntilChanged
**Ziel:** 40-50% weniger Change Detection Cycles
**Varianten:** Plan1 (direkt) + Plan2 (Services)

---

## 🎯 Erwartete Performance-Verbesserungen

### Baseline (vor Optimierung)
- **Total Emissions:** ~150 pro 5 Minuten normale Nutzung
- **Template Updates:** ~150 (jede Emission → Update)
- **Efficiency:** ~0% (keine Prevention)

### Nach Optimierung (erwartet)
- **Total Emissions:** ~150 pro 5 Minuten
- **Template Updates:** ~75-90 (40-50% verhindert durch distinctUntilChanged)
- **Efficiency:** **40-50%** (verhinderte Updates)

---

## 🔧 Methode 1: Browser Console Live-Testing

### Vorbereitung

1. **Starte Development Server:**
   ```bash
   cd client_angular
   npm start
   ```

2. **Öffne Application:**
   - URL: http://localhost:4200
   - Navigiere zum Evaluation Forum
   - Öffne Browser DevTools (F12)
   - Wechsle zu Console Tab

3. **Verifiziere Monitor-Verfügbarkeit:**
   ```javascript
   // In Browser Console
   window.viewModelMonitor

   // Expected output:
   // { getMetrics: ƒ, printMetrics: ƒ, reset: ƒ }
   ```

---

### Test-Szenario 1: Kommentar abschicken

**Ziel:** Nur uiState$ und finalViewModel$ sollten emittieren

```javascript
// 1. Reset metrics
window.viewModelMonitor.reset();

// 2. Schreibe einen Kommentar und sende ihn ab

// 3. Zeige Metriken
window.viewModelMonitor.printMetrics();
```

**Erwartetes Resultat:**
```
═══════════════════════════════════════════════
📊 VIEW MODEL PERFORMANCE METRICS
═══════════════════════════════════════════════
Core Data:         0    ✅ Keine Änderung
Discussion Data:   0    ✅ Keine Änderung (vor Reload)
Phase Permissions: 0    ✅ Keine Änderung
UI State:          2    ✅ 2 Emissions (submitting true → false)
Final ViewModel:   2    ✅ 2 Template Updates
Efficiency:        >0%  ✅ distinctUntilChanged funktioniert
═══════════════════════════════════════════════
```

**Wenn nicht erfüllt:**
- Core Data > 0: Bug - Kommentar sollte Core Data nicht ändern
- Discussion Data emittiert: Erwartet NACH Kommentar geladen wird
- Final ViewModel ≠ UI State: distinctUntilChanged fehlt

---

### Test-Szenario 2: Kategorie wechseln

**Ziel:** Core Data, Discussion Data und Final ViewModel emittieren

```javascript
// 1. Reset
window.viewModelMonitor.reset();

// 2. Klicke auf anderen Kategorie-Tab

// 3. Warte 2 Sekunden (Daten laden)

// 4. Zeige Metriken
window.viewModelMonitor.printMetrics();
```

**Erwartetes Resultat:**
```
Core Data:         1-2  ✅ activeCategory ändert sich
Discussion Data:   1-2  ✅ Neue Discussions laden
Phase Permissions: 0    ✅ Phase ändert sich nicht
UI State:          2-4  ✅ Loading true → false
Final ViewModel:   2-4  ✅ Template Updates
Efficiency:        >30% ✅ Einige Updates verhindert
```

---

### Test-Szenario 3: Langzeit-Monitoring (5 Minuten)

**Ziel:** Efficiency >40% über längere Nutzung

```javascript
// 1. Reset zu Beginn der Session
window.viewModelMonitor.reset();

// 2. Normale Nutzung für 5 Minuten:
//    - Kommentare lesen
//    - Eigene Kommentare schreiben
//    - Kategorien wechseln
//    - Bewertungen abgeben
//    - Scrollen

// 3. Nach 5 Minuten:
window.viewModelMonitor.printMetrics();
```

**Erwartetes Resultat:**
```
Uptime:            ~300s
Total Emissions:   50-100      ✅ Nicht zu viele
Final ViewModel:   30-60       ✅ 40-50% weniger als Summe aller Gruppen
Efficiency:        40-50%      ✅ ZIEL ERREICHT
```

**Erfolgs-Kriterien:**
- ✅ `Efficiency >= 40%`
- ✅ `Final ViewModel < (Core + Discussion + Permissions + UI State)`
- ✅ `Emissions/sec < 1`

---

## 🔬 Methode 2: Chrome DevTools Performance Profiler

### Schritt-für-Schritt Anleitung

#### 1. Baseline Recording (optional - zum Vergleich)

Falls du den alten Code noch hast:

```bash
# Checkout zu vor Optimierung
git stash
git checkout <commit-before-optimization>
npm start
```

1. Öffne Chrome DevTools → **Performance Tab**
2. Aktiviere **Web Vitals** in Settings
3. Click **Record** (roter Kreis)
4. Führe Standard-Aktionen aus:
   - Kommentar abschicken
   - Kategorie wechseln
   - Bewertung abgeben
   - Scrollen
5. Stop Recording (nach ~10 Sekunden)
6. Screenshot von Metriken:
   - **Summary → Scripting** (gelb)
   - **Bottom-Up → Filter "detectChanges"**

#### 2. Optimierte Version Recording

```bash
# Zurück zum optimierten Code
git stash pop  # oder git checkout main
```

Wiederhole gleiche Schritte wie Baseline.

#### 3. Vergleich

**Wichtige Metriken:**

| Metrik | Location | Erwartung |
|--------|----------|-----------|
| **Scripting Time** | Summary → Scripting (gelb) | -10-20% vs Baseline |
| **Change Detection Calls** | Bottom-Up → "detectChanges" | -40-50% Calls |
| **Rendering Time** | Summary → Rendering (lila) | -5-10% |
| **Frame Rate** | Summary → FPS | Stabil 60 FPS |

**Beispiel-Werte:**

```
VORHER (Baseline):
Scripting:         1,200ms
detectChanges:     85 calls
Rendering:         450ms

NACHHER (Optimiert):
Scripting:         1,000ms  (-17%)  ✅
detectChanges:     45 calls  (-47%)  ✅
Rendering:         410ms     (-9%)   ✅
```

---

## 🔍 Methode 3: Angular DevTools Profiler

### Installation & Setup

1. **Install Extension:**
   - Chrome Web Store: "Angular DevTools"
   - Nach Installation: Reload Page

2. **Öffne Profiler:**
   - DevTools → **Angular Tab** → **Profiler**

### Recording erstellen

```
1. Click "Start Recording" (roter Punkt)
2. Führe Aktion aus (z.B. Kommentar abschicken)
3. Click "Stop Recording" (schwarzes Quadrat)
4. Analysiere Flame Graph
```

### Flame Graph Analyse

**Erwartetes Ergebnis:**

```
✅ OPTIMAL:
EvaluationDiscussionForumComponent (1x update)
  ├── RatingGateComponent (0x update)     ← OnPush verhindert
  ├── CategoryTabsComponent (0x update)   ← OnPush verhindert
  └── DiscussionThreadComponent (0x update) ← OnPush verhindert

❌ SUBOPTIMAL:
EvaluationDiscussionForumComponent (3x update)  ← Zu viele!
  ├── RatingGateComponent (3x update)     ← OnPush funktioniert nicht
  ├── CategoryTabsComponent (3x update)   ← Problem!
  └── DiscussionThreadComponent (3x update) ← Problem!
```

**Bei suboptimalem Ergebnis:**
- distinctUntilChanged fehlt oder funktioniert nicht
- Child Components haben nicht `ChangeDetectionStrategy.OnPush`
- Inputs ändern sich unnötig (Referenz-Gleichheit prüfen)

---

## 📊 Methode 4: Automatisierte Performance Tests

### Unit Test Setup

**Datei:** `evaluation-discussion-forum.component.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { ViewModelPerformanceMonitorService } from '../services/view-model-performance-monitor.service';
import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum.component';

describe('EvaluationViewModel Performance', () => {
  let monitor: ViewModelPerformanceMonitorService;
  let component: EvaluationDiscussionForumComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluationDiscussionForumComponent],
      providers: [ViewModelPerformanceMonitorService]
    });

    monitor = TestBed.inject(ViewModelPerformanceMonitorService);
    const fixture = TestBed.createComponent(EvaluationDiscussionForumComponent);
    component = fixture.componentInstance;
  });

  it('should have efficiency >40% after normal usage simulation', (done) => {
    // Simulate 100 observable emissions with 50% duplicates
    const mockEmissions = [
      { id: 1, data: 'A' },
      { id: 1, data: 'A' }, // ← Duplicate - should be prevented
      { id: 2, data: 'B' },
      { id: 2, data: 'B' }, // ← Duplicate
      // ... repeat to 100 emissions
    ];

    let emittedCount = 0;
    from(mockEmissions).pipe(
      distinctUntilChanged((a, b) => a.id === b.id),
      monitor.trackEmission('test')
    ).subscribe({
      next: () => emittedCount++,
      complete: () => {
        const metrics = monitor.getMetrics();

        // Should emit only 50 times (duplicates prevented)
        expect(emittedCount).toBe(50);

        // Efficiency should be ~50%
        expect(metrics.efficiency).toBeGreaterThanOrEqual(40);
        expect(metrics.efficiency).toBeLessThanOrEqual(60);

        done();
      }
    });
  });

  it('should track emissions per semantic group', () => {
    monitor.reset();

    // Simulate group emissions
    const coreData$ = of({}).pipe(monitor.trackEmission('coreData'));
    const uiState$ = of({}).pipe(monitor.trackEmission('uiState'));

    forkJoin([coreData$, uiState$]).subscribe(() => {
      const metrics = monitor.getMetrics();

      expect(metrics.coreDataEmissions).toBe(1);
      expect(metrics.uiStateEmissions).toBe(1);
      expect(metrics.totalEmissions).toBe(2);
    });
  });
});
```

### Test ausführen

```bash
cd client_angular
npm test -- --include='**/evaluation-discussion-forum.component.spec.ts'
```

---

## ✅ Erfolgs-Checkliste

### Must-Have (Blocking)
- [ ] `window.viewModelMonitor` verfügbar in Browser Console
- [ ] `printMetrics()` zeigt alle 5 Gruppen (core, discussion, permissions, ui, final)
- [ ] TypeScript kompiliert ohne Fehler
- [ ] Keine Console Errors beim Laden der Seite
- [ ] Alle Funktionen arbeiten wie vorher

### Performance-Ziele (Target)
- [ ] **Efficiency >= 40%** nach 5 Min normaler Nutzung
- [ ] Final ViewModel Emissions < Summe aller Gruppen
- [ ] Chrome DevTools: -20% Scripting Time vs. Baseline (optional)
- [ ] Angular DevTools: Child Components updaten nicht unnötig

### Code Quality
- [ ] Compodoc-Dokumentation vollständig
- [ ] Performance-Monitor Service getestet
- [ ] Dokumentation aktualisiert

---

## 🐛 Troubleshooting

### Problem: Efficiency = 0%

**Ursache:** distinctUntilChanged fehlt oder funktioniert nicht

**Lösung:**
```typescript
// Prüfe ob ALLE Gruppen distinctUntilChanged haben
const coreData$ = combineLatest([...]).pipe(
  map(...),
  distinctUntilChanged(...), // ← MUSS vorhanden sein
  shareReplay({ bufferSize: 1, refCount: true })
);
```

### Problem: Zu viele Core Data Emissions

**Ursache:** Observables emittieren unnötig oft

**Lösung:**
- Prüfe ob Input-Observables `distinctUntilChanged` verwenden
- Prüfe ob `shareReplay` verwendet wird (verhindert multiple Subscriptions)

### Problem: Child Components updaten zu oft

**Ursache:** Fehlende OnPush Strategy oder Input-Referenzen ändern sich

**Lösung:**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush // ← Muss gesetzt sein
})
export class ChildComponent {
  @Input() data!: SomeDTO; // ← Referenz sollte stabil bleiben
}
```

---

## 📞 Support

**Bei Performance-Problemen:**
1. Führe alle 4 Test-Methoden durch
2. Dokumentiere Metriken (Screenshots)
3. Vergleiche mit erwarteten Werten
4. Erstelle GitHub Issue mit Metriken

**Kontakt:**
- GitHub Issues: https://github.com/your-repo/hefl/issues
- Dokumentation: docs/performance/
