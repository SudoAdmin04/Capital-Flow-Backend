import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LightScreenResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dashboard' })
  name: string;
}

export class ScreenResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 1 })
  parentId?: number | null;

  @ApiProperty({ example: 'Dashboard' })
  name: string;

  @ApiPropertyOptional({ example: '/dashboard' })
  path?: string | null;

  @ApiPropertyOptional({ example: 'layout-dashboard' })
  icon?: string | null;

  @ApiPropertyOptional({ example: 1 })
  order?: number | null;

  @ApiPropertyOptional({
    example: 'finanzas',
    description: 'Módulo o grupo lógico al que pertenece la pantalla',
  })
  module?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => [LightScreenResponseDto] })
  children?: LightScreenResponseDto[];

  @ApiPropertyOptional({ type: () => LightScreenResponseDto })
  parent?: LightScreenResponseDto | null;
}
