import { ModuleDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
