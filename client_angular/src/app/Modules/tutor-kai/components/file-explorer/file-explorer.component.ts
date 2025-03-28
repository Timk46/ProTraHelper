import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { EditorFolder, FileSystemItem, FileSystemService } from '../../services/file-system.service';

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  fileTree: FileSystemItem[] = [];
  projectRoot: string = '';
  isExplorerCollapsed: boolean = true; // Standardmäßig eingeklappt
  @Output() explorerCollapsedChange = new EventEmitter<boolean>();
  private destroy$ = new Subject<void>();

  constructor(private fileSystemService: FileSystemService) {}

  ngOnInit(): void {
    // Abonniere Dateibaum-Änderungen
    this.fileSystemService.fileTree$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tree => {
        this.fileTree = tree;
      });

    // Abonniere Projekt-Root-Änderungen
    this.fileSystemService.projectRoot$
      .pipe(takeUntil(this.destroy$))
      .subscribe(root => {
        this.projectRoot = root;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Prüft, ob ein Element ein Ordner ist
   */
  isFolder(item: FileSystemItem): boolean {
    return 'children' in item;
  }

  /**
   * Expandiert oder kollabiert einen Ordner
   */
  toggleFolder(folder: EditorFolder): void {
    folder.isExpanded = !folder.isExpanded;
  }

  /**
   * Öffnet oder aktiviert eine Datei
   */
  openFile(fileId: string): void {
    this.fileSystemService.openFileAsTab(fileId);
  }

  /**
   * Klappt den File Explorer ein oder aus
   */
  toggleExplorer(): void {
    this.isExplorerCollapsed = !this.isExplorerCollapsed;
    this.explorerCollapsedChange.emit(this.isExplorerCollapsed);
  }

  /**
   * Liefert ein Icon für einen Dateityp basierend auf der Dateierweiterung
   */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'js':
        return 'javascript-icon';
      case 'ts':
        return 'typescript-icon';
      case 'py':
        return 'python-icon';
      case 'java':
        return 'java-icon';
      case 'html':
        return 'html-icon';
      case 'css':
        return 'css-icon';
      case 'json':
        return 'json-icon';
      case 'md':
        return 'markdown-icon';
      case 'cpp':
      case 'c':
        return 'cpp-icon';
      case 'h':
        return 'h-icon';
      default:
        return 'file-icon';
    }
  }

  /**
   * Gibt die CSS-Klasse basierend auf dem Dateityp zurück
   */
  getFileClass(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'js':
        return 'js-file';
      case 'ts':
        return 'ts-file';
      case 'py':
        return 'py-file';
      case 'java':
        return 'java-file';
      case 'html':
        return 'html-file';
      case 'css':
        return 'css-file';
      case 'json':
        return 'json-file';
      case 'md':
        return 'md-file';
      case 'cpp':
      case 'c':
      case 'h':
        return 'cpp-file';
      default:
        return 'unknown-file';
    }
  }
}
