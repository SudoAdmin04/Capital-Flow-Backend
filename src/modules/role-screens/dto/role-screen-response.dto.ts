import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseForRoleScreenDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Administrator' })
  name: string;
}

export class ScreenResponseForRoleScreenDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dashboard' })
  name: string;
}

export class RoleScreenResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiProperty({ example: 1 })
  screenId: number;

  @ApiProperty({ example: true })
  canRead: boolean;

  @ApiProperty({ example: true })
  canCreate: boolean;

  @ApiProperty({ example: true })
  canUpdate: boolean;

  @ApiProperty({ example: true })
  canDelete: boolean;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => RoleResponseForRoleScreenDto })
  role?: RoleResponseForRoleScreenDto;

  @ApiPropertyOptional({ type: () => ScreenResponseForRoleScreenDto })
  screen?: ScreenResponseForRoleScreenDto;
}
