import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { RoleScreen } from '../role-screens/role-screen.entity';
import { Screen } from '../screens/screen.entity';
import { PermisoPantallaDto } from './dto/jwt-payload.dto';

export interface AccesoUsuario {
  roleId: number | null;
  role: string | null;
  isAdmin: boolean;
  permisos: PermisoPantallaDto[];
}

/**
 * Resuelve las pantallas que un usuario puede ver según su rol.
 * - Sin rol → sin permisos.
 * - Rol admin → TODAS las pantallas activas con CRUD total.
 * - Rol normal → solo asignaciones de role_screens con pantalla activa.
 */
@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(RoleScreen) private readonly roleScreens: Repository<RoleScreen>,
    @InjectRepository(Screen) private readonly screens: Repository<Screen>,
  ) {}

  async buildForRole(roleId: number | null): Promise<AccesoUsuario> {
    if (!roleId) return { roleId: null, role: null, isAdmin: false, permisos: [] };

    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role || !role.isActive) {
      return { roleId: null, role: null, isAdmin: false, permisos: [] };
    }

    if (role.isAdmin) {
      const screens = await this.screens.find({
        where: { isActive: true },
        order: { order: 'ASC', name: 'ASC' },
      });
      return {
        roleId: role.id,
        role: role.name,
        isAdmin: true,
        permisos: screens.map((s) => ({
          screenId: s.id,
          screen: s.name,
          parentId: s.parentId ?? null,
          path: s.path,
          module: s.module,
          icon: s.icon,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        })),
      };
    }

    const asignaciones = await this.roleScreens.find({
      where: { roleId: role.id },
      relations: { screen: true },
    });
    const permisos = asignaciones
      .filter((a) => a.screen?.isActive)
      .map((a) => ({
        screenId: a.screen.id,
        screen: a.screen.name,
        parentId: a.screen.parentId ?? null,
        module: a.module,
        path: a.screen.path,
        icon: a.screen.icon,
        canRead: a.canRead,
        canCreate: a.canCreate,
        canUpdate: a.canUpdate,
        canDelete: a.canDelete,
      }))
      .sort((a, b) => a.screen.localeCompare(b.screen));

    return { roleId: role.id, role: role.name, isAdmin: false, permisos };
  }

  /** Rol base para auto-registro público: primer rol no-admin activo (ej. "Usuario"). */
  async defaultRoleId(): Promise<number | null> {
    const rol = await this.roles.findOne({
      where: { isActive: true, isAdmin: false },
      order: { id: 'ASC' },
    });
    return rol?.id ?? null;
  }
}
