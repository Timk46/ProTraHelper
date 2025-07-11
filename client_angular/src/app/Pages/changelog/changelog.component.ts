import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

/**
 * Component for displaying the changelog in a modern design on the login page
 */
@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
})
export class ChangelogComponent implements OnInit {
  changelog: string = '';
  loading: boolean = true;
  error: string | null = null;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get('assets/CHANGELOG.md', { responseType: 'text' })
      .pipe(
        catchError(error => {
          console.error('Error loading changelog:', error);
          this.error = 'Fehler beim Laden des Changelogs';
          return of('');
        }),
      )
      .subscribe(content => {
        this.changelog = content;
        this.loading = false;
      });
  }
}
