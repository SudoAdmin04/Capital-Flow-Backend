import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoryKind } from '../../../../common/enums';

/**
 * Query params llegan siempre como string. El frontend suele mandar
 * `?categoryId=` (vacío) cuando no hay filtro; `@IsOptional()` solo omite
 * `null/undefined`, no `''`, y `@IsUUID()` fallaba con "uuid is expected".
 * Este transform convierte `''` / solo-espacios en `undefined` antes de validar.
 */
const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

/** Rango de la vista (Day pide 1 día, Week 7, Month ~31-42 con días vecinos). */
export class QueryCalendarDto {
  @ApiPropertyOptional({
    description: 'Inicio del rango visible (YYYY-MM-DD). Por defecto el día 1 del mes actual.',
    example: '2026-10-01',
    format: 'date',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin del rango visible (YYYY-MM-DD, inclusive). Por defecto el último día del mes actual. Máx. 366 días de rango.',
    example: '2026-10-31',
    format: 'date',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría (rubro o partida). Opcional.', format: 'uuid' })
  @EmptyToUndefined()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de categoría.', enum: CategoryKind })
  @EmptyToUndefined()
  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;
}

export class CreateCalendarEventDto {
  @ApiProperty({
    description: 'Categoría del presupuesto (de ahí salen kind/color/icono si no se sobreescriben).',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Presupuesto mensual vinculado (trazabilidad con el techo del mes). Opcional.',
    format: 'uuid',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  @ApiPropertyOptional({
    description: 'Título visible en la casilla. Por defecto el nombre de la categoría.',
    example: 'Nuxt Conf',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ description: 'Monto asignado al evento (≥ 0).', example: 3000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Fecha inicio (YYYY-MM-DD, inclusive).',
    example: '2026-10-20',
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Fecha fin (YYYY-MM-DD, inclusive). Igual a inicio = 1 día; posterior = barra multidía.',
    example: '2026-10-22',
    format: 'date',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Notas internas.', example: 'Boletos + hotel', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Color hex de la barra. Por defecto el de la categoría.',
    example: '#3b82f6',
  })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser hex #RRGGBB' })
  color?: string;

  @ApiPropertyOptional({ description: 'Evento de día completo (estilo Anna’s birthday).', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAllDay?: boolean;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}

/** Evento tal como lo devuelve la API, con campos derivados para pintar el calendario. */
export class CalendarEventResponseDto {
  @ApiProperty({ example: 'a7b8c9d0-e1f2-3456-abcd-567890123456' }) id: string;
  @ApiProperty({ example: 'Nuxt Conf' }) title: string;
  @ApiProperty({ example: 3000 }) amount: number;
  @ApiProperty({ example: '2026-10-20', format: 'date' }) startDate: string;
  @ApiProperty({ example: '2026-10-22', format: 'date' }) endDate: string;
  @ApiProperty({ description: '`true` si cruza más de un día (barra continua).', example: true }) isMultiDay: boolean;
  @ApiProperty({ description: 'Días totales del evento (fin − inicio + 1).', example: 3 }) spanDays: number;
  @ApiProperty({ description: 'Inicio recortado al rango pedido (para barras parciales en vista mes).', example: '2026-10-20' })
  visibleStart: string;
  @ApiProperty({ description: 'Fin recortado al rango pedido.', example: '2026-10-22' }) visibleEnd: string;
  @ApiProperty({ description: 'Días del evento dentro del rango (para pintar cada casilla).', example: ['2026-10-20', '2026-10-21', '2026-10-22'] })
  visibleDays: string[];
  @ApiProperty({ description: 'Color efectivo (override o categoría).', example: '#3b82f6', nullable: true }) color: string | null;
  @ApiProperty({ example: true }) isAllDay: boolean;
  @ApiProperty({ description: 'Categoría (resumen con kind/color/icono).' })
  category: { id: string; name: string; kind: string; color: string | null; icon: string | null };
  @ApiProperty({ description: 'Presupuesto mensual vinculado.', nullable: true, example: null }) budgetId: string | null;
  @ApiProperty({ description: 'Notas.', nullable: true, example: 'Boletos + hotel' }) notes: string | null;
}

/** `GET /budgets/calendar` — vista Day/Week/Month. */
export class CalendarRangeResponseDto {
  @ApiProperty({ example: { from: '2026-10-01', to: '2026-10-31' } }) range: { from: string; to: string };
  @ApiProperty({ description: 'Eventos que solapan el rango.', type: [CalendarEventResponseDto] })
  events: CalendarEventResponseDto[];
  @ApiProperty({
    description: 'Mapa día → ids de eventos (para pintar cada casilla como Google Calendar).',
    example: { '2026-10-20': ['a7b8c9d0-e1f2-3456-abcd-567890123456'] },
  })
  days: Record<string, string[]>;
  @ApiProperty({ description: 'Cantidad de eventos en el rango.', example: 5 }) count: number;
  @ApiProperty({ description: 'Suma de montos de los eventos del rango.', example: 18500 }) totalAmount: number;
}
