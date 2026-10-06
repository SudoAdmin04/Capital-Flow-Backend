import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

/**
 * Unifica TODAS las respuestas exitosas a:
 *   { message: string, ...datos }
 *
 * - Usa @ResponseMessage('...') del handler/clase, o 'Operación exitosa'.
 * - Si el servicio ya devolvió { message, ... }, se respeta.
 * - Arrays → { message, items: [...] }
 * - Paginados { items, total, page, limit, pages } → { message, ...paginado }
 * - Objetos → { message, ...objeto }
 * - DELETE 204 (void/null) → { message }
 * - NO toca errores (solo pasa por `next.handle()`).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, handler) ??
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, classRef) ??
      'Operación exitosa';

    return next.handle().pipe(
      map((data: any) => {
        if (data === undefined || data === null) return { message };

        // Ya viene con formato { message, ... } desde el servicio: respetar
        if (
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'message' in data
        ) {
          return data;
        }

        // Arrays → { message, items }
        if (Array.isArray(data)) return { message, items: data };

        // Objetos (incluye paginados y DTOs) → { message, ...data }
        if (typeof data === 'object') return { message, ...data };

        // Primitivos → { message, data }
        return { message, data };
      }),
    );
  }
}
