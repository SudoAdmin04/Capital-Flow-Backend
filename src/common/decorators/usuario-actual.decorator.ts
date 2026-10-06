import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PermisoPantallaDto } from '../../modules/auth/dto/jwt-payload.dto';

export interface AuthUser {
  userId: string;
  email?: string;
  roleId?: number | null;
  role?: string | null;
  isAdmin?: boolean;
  permisos?: PermisoPantallaDto[];
  [key: string]: any;
}

export const UsuarioActual = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: any }>();
    const user = request.user ?? {};
    // Normaliza: jwt.strategy devuelve entidad User (id) o payload (sub/userId)
    const userId: string =
      user.userId ?? user.sub ?? user.id ?? (typeof user === 'string' ? user : undefined);
    return { ...user, userId };
  },
);

/** Alias en inglés para compatibilidad: @CurrentUser() === @UsuarioActual() */
export const CurrentUser = UsuarioActual;
