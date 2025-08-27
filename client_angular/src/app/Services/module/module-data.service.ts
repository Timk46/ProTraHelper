import { ModuleDTO } from '@DTOs/index';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ModuleDataService {
  constructor(private readonly http: HttpClient) {}

  // get modules
  getUserModules(): Observable<ModuleDTO[]> {
    return this.http.get<ModuleDTO[]>(environment.server + '/UserModules/all');
  }

  // Currently getting the first module in the database
  // TODO: Implement when multiple modules are supported
  getCurrentModule(): Observable<ModuleDTO> {
    return this.getUserModules().pipe(map(modules => modules[0]));
  }
}
