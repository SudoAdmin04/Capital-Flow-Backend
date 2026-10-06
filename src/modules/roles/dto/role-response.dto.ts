import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScreenForRoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dashboard' })
  name: string;
}

export class RoleScreenForRoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: true })
  canRead: boolean;

  @ApiProperty({ example: true })
  canCreate: boolean;

  @ApiProperty({ example: true })
  canUpdate: boolean;

  @ApiProperty({ example: true })
  canDelete: boolean;

  @ApiProperty({ type: ScreenForRoleResponseDto })
  screen: ScreenForRoleResponseDto;
}

export class RoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Administrador' })
  name: string;

  @ApiPropertyOptional({ example: 'Rol con acceso total al sistema' })
  description?: string | null;

  @ApiProperty({ example: false })
  isAdmin: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: [RoleScreenForRoleResponseDto] })
  roleScreens?: RoleScreenForRoleResponseDto[];

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  updatedAt: Date;
}
