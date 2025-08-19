// src/common/interceptors/version.interceptor.ts
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { version } from '@DTOs/version';
import { map } from 'rxjs/operators';

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse();
        // Check if headers have already been sent
        if (!response.headersSent) {
          response.set('X-App-Version', version);
        }
        return data;
      }),
    );
  }
}
