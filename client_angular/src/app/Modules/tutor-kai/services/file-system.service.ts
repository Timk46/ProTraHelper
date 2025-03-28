import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { QuestionDTO } from '@DTOs/index';

/**
 * Schnittstelle für eine Datei im Dateisystem
 */
export interface EditorFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  isActive: boolean;
  isReadOnly?: boolean;
  isModified?: boolean;
}

/**
 * Schnittstelle für einen Ordner im Dateisystem
 */
export interface EditorFolder {
  id: string;
  name: string;
  path: string;
  isExpanded?: boolean;
  children: (EditorFile | EditorFolder)[];
}

/**
 * Typ für Dateisystemelemente (Datei oder Ordner)
 */
export type FileSystemItem = EditorFile | EditorFolder;

/**
 * Service zur Verwaltung des virtuellen Dateisystems für den Code-Editor
 */
@Injectable({
  providedIn: 'root'
})
export class FileSystemService {
  // Subjects für die reaktive Verarbeitung
  private filesSubject = new BehaviorSubject<EditorFile[]>([]);
  private activeFileSubject = new BehaviorSubject<EditorFile | null>(null);
  private fileTreeSubject = new BehaviorSubject<FileSystemItem[]>([]);
  private projectRootSubject = new BehaviorSubject<string>('');

  // Observables für die Komponenten
  readonly files$ = this.filesSubject.asObservable();
  readonly activeFile$ = this.activeFileSubject.asObservable();
  readonly fileTree$ = this.fileTreeSubject.asObservable();
  readonly projectRoot$ = this.projectRootSubject.asObservable();

  constructor() {}

  /**
   * Initialisiert das Dateisystem mit Dateien aus einer Aufgabe
   */
  initializeFromTask(task: QuestionDTO | null): void {
    if (!task || !task.codingQuestion || !task.codingQuestion.codeGerueste) {
      this.reset();
      return;
    }

    const projectName = `Aufgabe_${task.id}`;
    this.projectRootSubject.next(projectName);

    const files: EditorFile[] = [];
    const fileSystemItems: FileSystemItem[] = [];

    // Einfache Ordnerstruktur erstellen
    const mainFolder: EditorFolder = {
      id: 'src',
      name: 'src',
      path: `${projectName}/src`,
      isExpanded: true,
      children: []
    };

    fileSystemItems.push(mainFolder);

    // Dateien aus der Aufgabe konvertieren
    task.codingQuestion.codeGerueste.forEach((fileData, index) => {
      const language = this.detectLanguage(fileData.codeFileName);
      const file: EditorFile = {
        id: `file_${index}`,
        name: fileData.codeFileName,
        path: `${projectName}/src/${fileData.codeFileName}`,
        language: language,
        content: fileData.code,
        isActive: index === 0, // Erste Datei ist aktiv
        isModified: false
      };

      files.push(file);
      mainFolder.children.push(file);
    });

    // Wenn keine Dateien vorhanden, eine leere Standarddatei einfügen
    if (files.length === 0) {
      const language = task.codingQuestion.programmingLanguage || 'python';
      const defaultFileName = this.getDefaultFileName(language);

      const defaultFile: EditorFile = {
        id: 'file_default',
        name: defaultFileName,
        path: `${projectName}/src/${defaultFileName}`,
        language: language,
        content: '',
        isActive: true,
        isModified: false
      };

      files.push(defaultFile);
      mainFolder.children.push(defaultFile);
    }

    this.filesSubject.next(files);
    this.fileTreeSubject.next(fileSystemItems);
    this.activeFileSubject.next(files.find(f => f.isActive) || null);
  }

  /**
   * Setzt das Dateisystem zurück
   */
  reset(): void {
    this.filesSubject.next([]);
    this.activeFileSubject.next(null);
    this.fileTreeSubject.next([]);
    this.projectRootSubject.next('');
  }

  /**
   * Aktualisiert den Inhalt einer Datei
   */
  updateFileContent(fileId: string, content: string): void {
    const currentFiles = this.filesSubject.value;
    const updatedFiles = currentFiles.map(file => {
      if (file.id === fileId) {
        return { ...file, content, isModified: true };
      }
      return file;
    });

    this.filesSubject.next(updatedFiles);

    // Wenn die aktive Datei aktualisiert wurde, aktualisiere auch diese
    const activeFile = this.activeFileSubject.value;
    if (activeFile && activeFile.id === fileId) {
      this.activeFileSubject.next({
        ...activeFile,
        content,
        isModified: true
      });
    }

    // Aktualisiere die Datei auch im Dateibaum
    this.updateFileInTree(fileId, content);
  }

  /**
   * Aktualisiert eine Datei im Dateibaum
   */
  private updateFileInTree(fileId: string, content: string): void {
    const updateItemInTree = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.map(item => {
        if ('children' in item) {
          // Es ist ein Ordner
          return {
            ...item,
            children: updateItemInTree(item.children)
          };
        } else if (item.id === fileId) {
          // Es ist die gesuchte Datei
          return {
            ...item,
            content,
            isModified: true
          };
        }
        return item;
      });
    };

    const updatedTree = updateItemInTree(this.fileTreeSubject.value);
    this.fileTreeSubject.next(updatedTree);
  }

  /**
   * Setzt die aktive Datei
   */
  setActiveFile(fileId: string): void {
    const currentFiles = this.filesSubject.value;

    const updatedFiles = currentFiles.map(file => ({
      ...file,
      isActive: file.id === fileId
    }));

    this.filesSubject.next(updatedFiles);
    this.activeFileSubject.next(updatedFiles.find(f => f.isActive) || null);
  }

  /**
   * Fügt eine neue Datei hinzu
   */
  addNewFile(fileName: string, content: string = ''): void {
    const currentFiles = this.filesSubject.value;
    const projectRoot = this.projectRootSubject.value;
    const language = this.detectLanguage(fileName);

    const newFile: EditorFile = {
      id: `file_${Date.now()}`,
      name: fileName,
      path: `${projectRoot}/src/${fileName}`,
      language,
      content,
      isActive: false,
      isModified: true
    };

    const updatedFiles = [...currentFiles, newFile];
    this.filesSubject.next(updatedFiles);

    // Aktualisiere den Dateibaum
    const currentTree = this.fileTreeSubject.value;
    const updatedTree = this.addFileToTree(currentTree, newFile);
    this.fileTreeSubject.next(updatedTree);
  }

  /**
   * Fügt eine Datei zum Dateibaum hinzu
   */
  private addFileToTree(tree: FileSystemItem[], newFile: EditorFile): FileSystemItem[] {
    return tree.map(item => {
      if ('children' in item && item.name === 'src') {
        // Füge die Datei zum src-Ordner hinzu
        return {
          ...item,
          children: [...item.children, newFile]
        };
      }
      return item;
    });
  }

  /**
   * Schließt eine Datei
   */
  closeFile(fileId: string): void {
    const currentFiles = this.filesSubject.value;
    const fileToClose = currentFiles.find(f => f.id === fileId);

    if (!fileToClose) return;

    const updatedFiles = currentFiles.filter(f => f.id !== fileId);

    // Wenn die zu schließende Datei die aktive ist, aktiviere eine andere
    if (fileToClose.isActive && updatedFiles.length > 0) {
      updatedFiles[0].isActive = true;
    }

    this.filesSubject.next(updatedFiles);

    if (fileToClose.isActive) {
      this.activeFileSubject.next(updatedFiles.find(f => f.isActive) || null);
    }

    // Aktualisiere den Dateibaum
    const currentTree = this.fileTreeSubject.value;
    const updatedTree = this.removeFileFromTree(currentTree, fileId);
    this.fileTreeSubject.next(updatedTree);
  }

  /**
   * Entfernt eine Datei aus dem Dateibaum
   */
  private removeFileFromTree(tree: FileSystemItem[], fileId: string): FileSystemItem[] {
    return tree.map(item => {
      if ('children' in item) {
        return {
          ...item,
          children: item.children.filter(child =>
            // Wenn es eine Datei ist, behalte sie nur, wenn die ID nicht übereinstimmt
            !('content' in child) || child.id !== fileId
          )
        };
      }
      return item;
    });
  }

  /**
   * Konvertiert die Dateien in ein Record-Objekt für die API
   */
  getFilesAsRecord(): Record<string, string> {
    const files: Record<string, string> = {};
    this.filesSubject.value.forEach(file => {
      files[file.name] = file.content;
    });
    return files;
  }

  /**
   * Gibt alle verfügbaren Dateien zurück
   */
  getAllFiles(): EditorFile[] {
    return this.filesSubject.value;
  }

  /**
   * Gibt die aktive Datei zurück
   */
  getActiveFile(): EditorFile | null {
    return this.activeFileSubject.value;
  }

  /**
   * Erkennt die Sprache basierend auf der Dateierweiterung
   */
  private detectLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'cpp':
      case 'c':
      case 'h':
        return 'cpp';
      default:
        return 'plaintext';
    }
  }

  /**
   * Gibt einen Standarddateinamen basierend auf der Sprache zurück
   */
  private getDefaultFileName(language: string): string {
    switch (language) {
      case 'javascript':
        return 'main.js';
      case 'typescript':
        return 'main.ts';
      case 'python':
        return 'main.py';
      case 'java':
        return 'Main.java';
      case 'cpp':
        return 'main.cpp';
      default:
        return 'main.txt';
    }
  }
}
