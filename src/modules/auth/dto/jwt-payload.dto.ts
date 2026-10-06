import { ApiProperty } from '@nestjs/swagger';

/** Permiso efectivo sobre una pantalla: lo que el usuario puede ver/hacer según su rol. */
export class PermisoPantallaDto {
  @ApiProperty({ example: 1, description: 'ID de la pantalla.' })
  screenId: number;

  @ApiProperty({ example: 'Dashboard', description: 'Nombre de la pantalla.' })
  screen: string;

  @ApiProperty({ example: '/dashboard', nullable: true })
  path: string | null;

  @ApiProperty({ example: 'layout-dashboard', nullable: true })
  icon: string | null;

  @ApiProperty({ example: true })
  canRead: boolean;

  @ApiProperty({ example: false })
  canCreate: boolean;

  @ApiProperty({ example: false })
  canUpdate: boolean;

  @ApiProperty({ example: false })
  canDelete: boolean;
}

/**
 * Contenido del JWT (access y refresh).
 * `permisos` = pantallas que el usuario puede ver según su rol.
 * Si el rol es admin, trae TODAS las pantallas activas con CRUD total.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  roleId: number | null;
  role: string | null;
  isAdmin: boolean;
  permisos: PermisoPantallaDto[];
}
