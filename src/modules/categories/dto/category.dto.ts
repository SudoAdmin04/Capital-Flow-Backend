import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { CategoryKind } from '../../../common/enums';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría. Único por nivel (mismo padre). Ej. rubro "Gastos", partida "Súper".',
    example: 'Súper',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description:
      'Naturaleza del rubro: `income` (Sueldo), `expense` (Gastos), `savings` (Ahorro), `debt` (Deudas). Obligatorio para rubros; las partidas heredan el kind del rubro.',
    enum: CategoryKind,
    example: CategoryKind.EXPENSE,
  })
  /** Obligatorio para rubros; las partidas heredan el kind del rubro. */
  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  @ApiPropertyOptional({
    description: 'Si se envía, la categoría se crea como partida de ese rubro. Solo 2 niveles (rubro → partida).',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  /** Si se envía, la categoría es una partida de ese rubro. */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Color hex para gráficas (donut, reportes).',
    example: '#3b82f6',
    pattern: '^#[0-9a-fA-F]{6}$',
  })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser hex, ej. #3b82f6' })
  color?: string;

  @ApiPropertyOptional({
    description: 'Icono (nombre de icono del frontend, ej. lucide).',
    example: 'shopping-cart',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de aparición en listados.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['parentId', 'kind'] as const)) {
  @ApiPropertyOptional({
    description: 'Desactiva la categoría sin borrarla (recomendado si ya tiene movimientos o presupuestos).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Categoría tal como la devuelve la API. */
export class CategoryResponseDto {
  @ApiProperty({ description: 'UUID de la categoría.', example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  id: string;

  @ApiProperty({ description: 'Nombre (único por nivel).', example: 'Súper' })
  name: string;

  @ApiProperty({ description: 'Naturaleza del rubro.', enum: CategoryKind, example: CategoryKind.EXPENSE })
  kind: CategoryKind;

  @ApiProperty({ description: 'UUID del rubro padre; null si es rubro.', example: null, nullable: true })
  parentId: string | null;

  @ApiProperty({ description: 'Color hex.', example: '#3b82f6', nullable: true })
  color: string | null;

  @ApiProperty({ description: 'Icono.', example: 'shopping-cart', nullable: true })
  icon: string | null;

  @ApiProperty({ description: 'Orden en listados.', example: 0 })
  sortOrder: number;

  @ApiProperty({ description: 'Activa o desactivada.', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/** Rubro con sus partidas anidadas (`GET /categories?tree=true`). */
export class CategoryTreeResponseDto extends CategoryResponseDto {
  @ApiProperty({ description: 'Partidas del rubro (vacío en partidas).', type: [CategoryResponseDto] })
  children: CategoryResponseDto[];
}
