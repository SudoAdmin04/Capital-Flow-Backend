import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Categoría (rubro o partida) a presupuestar. La combinación categoría+año+mes es única.',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Año del presupuesto.', example: 2025, minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Mes del presupuesto (1-12).', example: 10, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Límite mensual. En egresos/deudas es un techo; en ingresos/ahorro es una meta a alcanzar.',
    example: 4000,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}

export class UpdateBudgetDto {
  @ApiProperty({
    description: 'Nuevo límite. Si cambia, se registra el ajuste en el historial.',
    example: 4500,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Motivo del ajuste (visible en el historial).',
    example: 'Ajuste por inflación de despensa',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class QueryBudgetsDto {
  @ApiProperty({ description: 'Año a consultar.', example: 2025, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Mes a consultar (1-12).', example: 10, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class CopyBudgetsDto {
  @ApiProperty({ description: 'Año origen.', example: 2025 })
  @IsInt() @Min(2000) @Max(2100) fromYear: number;
  @ApiProperty({ description: 'Mes origen.', example: 9 })
  @IsInt() @Min(1) @Max(12) fromMonth: number;
  @ApiProperty({ description: 'Año destino (debe ser distinto al origen).', example: 2025 })
  @IsInt() @Min(2000) @Max(2100) toYear: number;
  @ApiProperty({ description: 'Mes destino.', example: 10 })
  @IsInt() @Min(1) @Max(12) toMonth: number;
}

export class RecentAdjustmentsDto {
  @ApiPropertyOptional({
    description: 'Ventana de días hacia atrás (máximo 365).',
    example: 14,
    default: 14,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

/** Presupuesto tal como lo devuelve la API, con su categoría. */
export class BudgetResponseDto {
  @ApiProperty({ description: 'UUID del presupuesto.', example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  id: string;

  @ApiProperty({ description: 'UUID de la categoría presupuestada.', example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  categoryId: string;

  @ApiProperty({ description: 'Categoría (resumen).' })
  category: { id: string; name: string; kind: string };

  @ApiProperty({ description: 'Año.', example: 2025 })
  year: number;

  @ApiProperty({ description: 'Mes (1-12).', example: 10 })
  month: number;

  @ApiProperty({ description: 'Límite mensual.', example: 4000 })
  amount: number;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/** Ajuste del historial (`budget-adjustments`). */
export class BudgetAdjustmentResponseDto {
  @ApiProperty({ description: 'UUID del ajuste.', example: 'a7b8c9d0-e1f2-3456-abcd-567890123456' })
  id: string;

  @ApiProperty({ description: 'UUID del presupuesto ajustado.', example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  budgetId: string;

  @ApiProperty({ description: 'Límite anterior.', example: 4000 })
  previousAmount: number;

  @ApiProperty({ description: 'Límite nuevo.', example: 4500 })
  newAmount: number;

  @ApiProperty({ description: 'Motivo del ajuste.', example: 'Ajuste por inflación', nullable: true })
  reason: string | null;

  @ApiProperty({ description: 'Origen: `manual` o `system`.', example: 'manual' })
  source: string;

  @ApiProperty({ description: 'Fecha del ajuste.', example: '2025-10-05T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/** Resultado de `POST /budgets/copy`. */
export class CopyBudgetsResponseDto {
  @ApiProperty({ description: 'Presupuestos creados en el destino.', example: 8 })
  created: number;

  @ApiProperty({ description: 'Omitidos por ya existir en el destino.', example: 2 })
  skipped: number;
}

/** Periodo mensual resuelto. */
export class BudgetPeriodDto {
  @ApiProperty({ example: 2025 }) year: number;
  @ApiProperty({ example: 10 }) month: number;
  @ApiProperty({ description: 'Primer día del mes.', example: '2025-10-01' }) from: string;
  @ApiProperty({ description: 'Último día del mes.', example: '2025-10-31' }) to: string;
}

export class BudgetStatsTotalsDto {
  @ApiProperty({ description: 'Total planificado (Σ presupuestos, sin income).', example: 26619 })
  planificado: number;

  @ApiProperty({ description: 'Total ejecutado (Σ gasto real, sin income).', example: 20100 })
  ejecutado: number;

  @ApiProperty({ description: 'Presupuesto restante = planificado − ejecutado.', example: 6519 })
  restante: number;

  @ApiProperty({ description: 'Tasa de ejecución = ejecutado / planificado * 100 (null sin plan).', example: 75.51, nullable: true })
  tasaEjecucion: number | null;
}

export class BudgetStatsCountsDto {
  @ApiProperty({ description: 'Total de rubros con plan o movimiento.', example: 4 })
  total: number;

  @ApiProperty({ description: 'Rubros en orden (within + met).', example: 2 })
  enOrden: number;

  @ApiProperty({ description: 'Rubros cerca del límite (≥90%).', example: 1 })
  cercaLimite: number;

  @ApiProperty({ description: 'Rubros excedidos (exceeded + unbudgeted).', example: 1 })
  excedidos: number;
}

/** `GET /budgets/stats` — cards de totales. */
export class BudgetStatsResponseDto {
  @ApiProperty({ type: BudgetPeriodDto }) periodo: BudgetPeriodDto;

  @ApiProperty({ type: BudgetStatsTotalsDto }) totales: BudgetStatsTotalsDto;

  @ApiProperty({ type: BudgetStatsCountsDto }) conteos: BudgetStatsCountsDto;
}

/** Una fila de la comparativa Planificado vs Ejecutado. */
export class BudgetComparisonItemDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ description: 'Nombre del rubro.', example: 'Gastos Generales' }) name: string;
  @ApiProperty({ description: '`expense | savings | debt`.', example: 'expense' }) kind: string;
  @ApiProperty({ example: '#3b82f6', nullable: true }) color: string | null;
  @ApiProperty({ example: 'shopping_cart', nullable: true }) icon: string | null;
  @ApiProperty({ description: 'Techo de asignación (presupuesto).', example: 15144 }) planificado: number;
  @ApiProperty({ description: 'Gasto devengado real.', example: 13811 }) ejecutado: number;
  @ApiProperty({ description: 'ejecutado − planificado. En egresos positivo = sobregiro.', example: -1333 }) varianza: number;
  @ApiProperty({ description: 'ejecutado / planificado * 100 (null sin plan).', example: 91.2, nullable: true }) tasaEjecucion: number | null;
  @ApiProperty({ description: '`within | near | exceeded | unbudgeted | met | below`.', example: 'within' }) estado: string;
}

/** `GET /budgets/comparison` — componente Comparativa: Planificado vs Ejecutado. */
export class BudgetComparisonResponseDto {
  @ApiProperty({ type: BudgetPeriodDto }) periodo: BudgetPeriodDto;
  @ApiProperty({ description: 'Identificador del periodo para el footer (ej. PER-2025-10-MTRX).', example: 'PER-2025-10-MTRX' })
  periodoId: string;

  @ApiProperty({ type: BudgetStatsTotalsDto }) totales: BudgetStatsTotalsDto;

  @ApiProperty({ description: 'Saldo neto del mes (ingresos − egresos). Negativo = déficit.', example: -6519 })
  saldoNeto: number;

  @ApiProperty({ description: '¿El mes cierra en déficit?', example: true })
  esDeficit: boolean;

  @ApiProperty({ type: [BudgetComparisonItemDto] }) items: BudgetComparisonItemDto[];
}
