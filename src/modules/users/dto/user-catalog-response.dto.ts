import { ApiProperty } from '@nestjs/swagger';

/**
 * Refleja el objeto `role` real que devuelve TypeORM con `relations: { role: true }`.
 * NO incluye `roleScreens` (no se cargan en el catálogo de usuarios).
 */
export class RoleBriefDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Usuario' })
  name: string;

  @ApiProperty({ example: 'Rol base con permisos limitados', nullable: true })
  description: string | null;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Respuesta REAL del catálogo de usuarios (`UsersService`).
 * Corresponde a la entidad `User` con `role` poblado como objeto (o null),
 * envuelta por `TransformInterceptor` como `{ message, ...usuario }`,
 * `{ message, items: [...] }` o `{ message, data: [...], total }`.
 * Sin `passwordHash` (select:false) y sin `isAdmin` a nivel usuario
 * (ese flag vive en `role.isAdmin` y en el JWT, no en la entidad).
 */
export class UserCatalogResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Alan' })
  name: string;

  @ApiProperty({ example: 'alan@example.com' })
  email: string;

  @ApiProperty({ example: 'MXN' })
  currency: string;

  @ApiProperty({ example: 'America/Monterrey' })
  timezone: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 2, nullable: true, description: 'FK al rol. null = sin rol.' })
  roleId: number | null;

  @ApiProperty({
    type: RoleBriefDto,
    nullable: true,
    description: 'Rol poblado vía relations. null si el usuario no tiene rol.',
  })
  role: RoleBriefDto | null;

  @ApiProperty({ example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}
