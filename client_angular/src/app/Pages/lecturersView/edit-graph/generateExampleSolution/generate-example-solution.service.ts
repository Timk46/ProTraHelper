import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GraphStructureDTO } from '@DTOs/index';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GenerateExampleSolutionService {
  private readonly genSolutionUrl = `${environment.server}/graph-example-solution-generation`;

  constructor(private readonly http: HttpClient) {}

  generateTransitiveClosureExampleSolution(
    initialStructure: GraphStructureDTO,
  ): Observable<GraphStructureDTO[]> {
    return this.http.post<GraphStructureDTO[]>(`${this.genSolutionUrl}/transitive-closure`, {
      initialStructure,
    });
  }

  generateFloydExampleSolution(
    initialStructure: GraphStructureDTO,
  ): Observable<GraphStructureDTO[]> {
    return this.http.post<GraphStructureDTO[]>(`${this.genSolutionUrl}/floyd`, {
      initialStructure,
    });
  }

  generateKruskalExampleSolution(
    initialStructure: GraphStructureDTO,
  ): Observable<GraphStructureDTO[]> {
    return this.http.post<GraphStructureDTO[]>(`${this.genSolutionUrl}/kruskal`, {
      initialStructure,
    });
  }

  generateDijkstraExampleSolution(
    initialStructure: GraphStructureDTO,
  ): Observable<GraphStructureDTO[]> {
    return this.http.post<GraphStructureDTO[]>(`${this.genSolutionUrl}/dijkstra`, {
      initialStructure,
    });
  }
}
