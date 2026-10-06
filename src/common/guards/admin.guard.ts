import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/** Solo roles admin (isAdmin del JWT). Úsalo en gestión de usuarios/roles. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: any }>().user;
    if (user?.isAdmin) return true;
    throw new ForbiddenException('Requiere rol administrador.');
  }
}
