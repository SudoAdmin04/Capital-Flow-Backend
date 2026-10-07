import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CategoriesService } from '../categories/categories.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegistroDto } from './dto/registro.dto';
import { PermisosService } from './permisos.service';

function toUserResponse(user: User, acceso: { roleId: number | null; role: string | null; isAdmin: boolean; permisos: any[] }) {
  const { passwordHash, ...rest } = user as any;
  return { ...rest, roleId: acceso.roleId, role: acceso.role, isAdmin: acceso.isAdmin};
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly categoriesService: CategoriesService,
    private readonly permisosService: PermisosService,
  ) {}

  private signPair(payload: JwtPayload) {
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '1d' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  /** Flujo: usuario → rol base + catálogo sembrado → crea cuentas → registra ingresos/egresos (transactions). */
  async registro(registroDto: RegistroDto) {
    const existing = await this.usersService.findByEmail(registroDto.email);
    if (existing) throw new ConflictException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(registroDto.password, 12);
    // Auto-registro público: rol base no-admin (nunca admin). El rol se asigna vía PATCH /users/:id/rol (admin).
    const roleId = await this.permisosService.defaultRoleId();
    const created = await this.usersService.create({
      email: registroDto.email,
      passwordHash,
      name: registroDto.name,
      currency: registroDto.currency,
      timezone: registroDto.timezone,
      roleId,
    });
    if (!created) throw new ConflictException('El correo ya está registrado');

    // Catálogo base del Excel para que pueda operar desde el día 1
    await this.categoriesService.seedDefaults(created.id);

    const acceso = await this.permisosService.buildForRole(created.roleId);
    const payload: JwtPayload = {
      sub: created.id,
      email: created.email,
      roleId: acceso.roleId,
      role: acceso.role,
      isAdmin: acceso.isAdmin,
      permisos: acceso.permisos,
    };
    return { ...this.signPair(payload), usuario: toUserResponse(created, acceso) };
  }

  /** Alias en inglés para compatibilidad con seeds/scripts. */
  register(dto: RegistroDto) {
    return this.registro(dto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);
    if (!user) throw new UnauthorizedException('Correo o contraseña incorrectos.');

    const ok = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    if (!user.isActive) throw new UnauthorizedException('El usuario está desactivado.');

    const acceso = await this.permisosService.buildForRole(user.roleId ?? null);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: acceso.roleId,
      role: acceso.role,
      isAdmin: acceso.isAdmin,
      permisos: acceso.permisos,
    };
    const full = await this.usersService.findById(user.id);
    return { ...this.signPair(payload), usuario: toUserResponse(full!, acceso) };
  }

  async refresh(refreshDto: RefreshDto) {
    try {
      const decoded = this.jwtService.verify<{ sub: string; email: string }>(
        refreshDto.refresh_token,
      );
      const user = await this.usersService.findById(decoded.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          'Token de actualización inválido o usuario inactivo.',
        );
      }
      // Permisos siempre frescos desde BD (revocar acceso no exige re-login)
      const acceso = await this.permisosService.buildForRole(user.roleId ?? null);
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: acceso.roleId,
        role: acceso.role,
        isAdmin: acceso.isAdmin,
        permisos: acceso.permisos,
      };
      return {
        ...this.signPair(payload),
        usuario: toUserResponse(user, acceso),
      };
    } catch {
      throw new UnauthorizedException(
        'Token de actualización inválido o expirado.',
      );
    }
  }
}
