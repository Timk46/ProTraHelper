# Part 7: Upload Task Component - Nord Theme Styling

## Übersicht
Das Upload-Task Component implementiert eine moderne Datei-Upload-Funktionalität mit Nord Theme Design. Es bietet Drag & Drop, Dateivorschau und animierte Benutzerinteraktionen.

## Nord Theme Variablen
Das Component nutzt das vollständige Nord Color Palette:

```scss
// Polar Night (Dunkle Farben)
$nord0: #2e3440; // Haupttext
$nord3: #4c566a; // Sekundärtext

// Snow Storm (Helle Farben)
$nord4: #d8dee9; // Rahmen
$nord6: #eceff4; // Hintergrund

// Frost (Blaue Akzente)
$nord8: #88c0d0; // Primäre Akzente
$nord10: #5e81ac; // Icons

// Aurora (Farbige Akzente)
$nord11: #bf616a; // Rot (Löschen)
$nord14: #a3be8c; // Grün (Erfolg)
```

## Hauptkomponenten-Struktur

### Container mit Gradient-Overlay
```scss
.upload-container {
  padding: 44px;
  background: $nord6;
  position: relative;

  &::before {
    background: linear-gradient(135deg, 
      rgba(94, 129, 172, 0.05) 0%, 
      rgba(136, 192, 208, 0.03) 100%);
  }
}
```

### Header mit Icon und Titel
```scss
.upload-icon {
  color: $nord10;
  background: rgba(94, 129, 172, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  width: 56px;
  height: 56px;
}

.upload-title {
  color: $nord0;
  font-size: 24px;
  font-weight: 600;
}
```

## Drag & Drop Zone

### Basis-Styling
```scss
.drop-zone {
  background: white;
  border: 2px dashed $nord8;
  border-radius: 15px;
  padding: 48px 24px;
  min-height: 200px;
  transition: all 0.3s ease;

  &:hover {
    border-color: $nord10;
    background: $nord6;
    transform: translateY(-2px);
  }

  &.drag-over {
    border-color: $nord10;
    background: rgba(94, 129, 172, 0.05);
    transform: scale(1.02);
  }
}
```

### Upload-Animation
```scss
.upload-cloud {
  font-size: 48px;
  color: $nord8;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

## Requirements Section

### Grid Layout
```scss
.requirements-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.requirement-card {
  background: white;
  padding: 16px;
  border-radius: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

## Datei-Preview

### Icon-Styling nach Dateityp
```scss
.file-icon {
  &.file-icon-image {
    color: $nord12;
    background: rgba(208, 135, 112, 0.1);
  }

  &.file-icon-pdf {
    color: $nord11;
    background: rgba(191, 97, 106, 0.1);
  }

  &.file-icon-video {
    color: $nord15;
    background: rgba(180, 142, 173, 0.1);
  }
}
```

## Action Buttons

### Upload Button mit Gradient
```scss
.upload-btn {
  background: linear-gradient(45deg, $nord14, darken($nord14, 10%));
  color: white;
  border-radius: 15px;
  box-shadow: 0 2px 8px rgba(163, 190, 140, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(163, 190, 140, 0.4);
  }
}
```

## Animationen

### Loading-Spinner
```scss
.uploading-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Bounce-Dots
```scss
.upload-dots .dot {
  animation: bounce 1.5s infinite;
  
  &:nth-child(2) { animation-delay: 0.3s; }
  &:nth-child(3) { animation-delay: 0.6s; }
}
```

## Responsive Design

```scss
@media (max-width: 768px) {
  .upload-container {
    padding: 16px;
  }

  .requirements-section {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
```

## Design-Prinzipien

1. **Konsistente Farben**: Ausschließliche Verwendung der Nord Theme Palette
2. **Sanfte Übergänge**: 0.3s ease transitions für alle Hover-Effekte
3. **Abgerundete Ecken**: 15px border-radius für moderne Optik
4. **Schatten-Hierarchie**: Verschiedene box-shadow Stärken für Tiefe
5. **Responsive Grid**: Auto-fit Layout für verschiedene Bildschirmgrößen

## Besondere Features

- **Backdrop Blur**: Moderne Glasmorphism-Effekte
- **Gradient Overlays**: Subtile Hintergrund-Gradienten
- **Animation States**: Verschiedene Zustände (hover, drag-over, loading)
- **Dateityp-Icons**: Farbkodierte Icons basierend auf Dateierweiterung
- **Progress Indicators**: Animierte Upload-Fortschrittsanzeige
