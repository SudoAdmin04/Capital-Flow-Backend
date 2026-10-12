import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { PermisosService } from '../permisos.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly permisosService: PermisosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'SECRETO_SUPER_SEGURO',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no autorizado o inactivo');
    }
    const acceso = await this.permisosService.buildForRole(user.roleId ?? null);
    return {
      ...user,
      userId: user.id,
      roleId: acceso.roleId,
      role: acceso.role,
      isAdmin: acceso.isAdmin,
      permisos: acceso.permisos,
    };
  }
}
