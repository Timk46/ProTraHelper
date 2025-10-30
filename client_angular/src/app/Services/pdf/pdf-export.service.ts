import { Injectable } from '@angular/core';

/**
 * Service for handling PDF export and download operations
 *
 * @description Provides utilities for generating clean filenames and
 * programmatically downloading PDF files from URLs
 */
@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  constructor() { }

  /**
   * Generates a sanitized filename for PDF download
   *
   * @param title - The title to convert to filename
   * @returns Sanitized filename with .pdf extension
   * @example
   * generateFilename("My Document!") // returns "my-document.pdf"
   * generateFilename("Test@123#File") // returns "test-123-file.pdf"
   */
  generateFilename(title: string): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${cleanTitle || 'dokument'}.pdf`;
  }

  /**
   * Downloads a PDF file programmatically by creating a temporary link
   *
   * @param url - The PDF file URL to download
   * @param title - The document title for generating filename
   * @throws Error if download fails or if URL/title are invalid
   * @example
   * downloadPdf('https://example.com/file.pdf', 'My Report')
   */
  downloadPdf(url: string, title: string): void {
    if (!url || !title) {
      throw new Error('URL and title are required for PDF download');
    }

    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateFilename(title);
      link.target = '_blank';

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('❌ PDF download failed:', error);
      throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
