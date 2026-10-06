import { ApiProperty } from '@nestjs/swagger';
import { PermisoPantallaDto } from '../../auth/dto/jwt-payload.dto';

export class UserResponseDto {
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

  @ApiProperty({ example: 1, nullable: true, description: 'Rol asignado (RBAC).' })
  roleId: number | null;

  @ApiProperty({ example: 'Usuario', nullable: true, description: 'Nombre del rol.' })
  role: string | null;

  @ApiProperty({ example: false, description: 'Acceso total (todas las pantallas con CRUD).' })
  isAdmin: boolean;

  @ApiProperty({
    type: [PermisoPantallaDto],
    description: 'Pantallas que el usuario puede ver según su rol, con sus permisos.',
  })
  permisos: PermisoPantallaDto[];

  @ApiProperty({ example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}
