import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { EditorFile, FileSystemService } from '../../services/file-system.service';

@Component({
  selector: 'app-editor-tabs',
  templateUrl: './editor-tabs.component.html',
  styleUrls: ['./editor-tabs.component.scss']
})
export class EditorTabsComponent implements OnInit, OnDestroy {
  openFiles: EditorFile[] = [];
  private destroy$ = new Subject<void>();

  constructor(private fileSystemService: FileSystemService) {}

  ngOnInit(): void {
    // Abonniere Dateiänderungen
    this.fileSystemService.files$
      .pipe(takeUntil(this.destroy$))
      .subscribe(files => {
        this.openFiles = files;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Aktiviert eine Datei, wenn der Tab angeklickt wird
   */
  activateFile(fileId: string): void {
    this.fileSystemService.setActiveFile(fileId);
  }

  /**
   * Schließt eine Datei, wenn das X-Symbol geklickt wird
   */
  closeFile(event: MouseEvent, fileId: string): void {
    event.stopPropagation(); // Verhindert, dass der Tab aktiviert wird
    this.fileSystemService.closeFile(fileId);
  }

  /**
   * Liefert ein Icon basierend auf dem Dateityp/der Sprache
   */
  getFileIcon(file: EditorFile): string {
    switch (file.language) {
      case 'python':
        return 'code-python';
      case 'java':
        return 'code-java';
      case 'javascript':
        return 'javascript';
      case 'typescript':
        return 'typescript';
      case 'html':
        return 'code-html';
      case 'css':
        return 'code-css';
      case 'json':
        return 'code-json';
      case 'markdown':
        return 'markdown';
      case 'cpp':
        return 'code-cpp';
      default:
        return 'document';
    }
  }
}
