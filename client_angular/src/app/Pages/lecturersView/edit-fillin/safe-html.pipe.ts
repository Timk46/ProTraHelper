import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(value: string | SafeHtml): SafeHtml {
    if (value === null) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    if (typeof value === 'string') {
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }
    return value;
  }
}
