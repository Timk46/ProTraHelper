import type { ModuleDTO } from '@DTOs/index';
import type { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ModuleDataService {
  constructor(private readonly http: HttpClient) {}

  // get modules
  getUserModules(): Observable<ModuleDTO[]> {
    return this.http.get<ModuleDTO[]>(environment.server + '/modules');
  }
}
