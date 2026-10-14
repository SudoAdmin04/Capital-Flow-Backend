import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/** Periodo mensual. Si se omite, se usa el mes actual. */
export class PeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Año del periodo. Por defecto el año actual (UTC).',
    example: 2025,
    minimum: 2000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Mes del periodo (1-12). Por defecto el mes actual (UTC).',
    example: 10,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class AnalyticsQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Cantidad de meses de historial (termina en el periodo indicado).',
    example: 6,
    default: 6,
    minimum: 2,
    maximum: 60,
  })
  /** Cantidad de meses de historial (termina en el periodo indicado). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  months?: number;

  @ApiPropertyOptional({
    description: 'Meta de tasa de ahorro (% del ingreso). Se usa para calcular `savingsGap`.',
    example: 15,
    default: 15,
    minimum: 0,
    maximum: 100,
  })
  /** Meta de tasa de ahorro (% del ingreso). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  savingsTargetPercent?: number;
}

/** Periodo resuelto por la API (`from/to` son los límites del mes). */
export class PeriodResponseDto {
  @ApiProperty({ example: 2025 }) year: number;
  @ApiProperty({ example: 10 }) month: number;
  @ApiProperty({ description: 'Primer día del mes.', example: '2025-10-01' }) from: string;
  @ApiProperty({ description: 'Último día del mes.', example: '2025-10-31' }) to: string;
}

/** Línea de presupuesto vs real por rubro/partida. */
export class BudgetLineResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Gastos' }) name: string;
  @ApiProperty({ description: '`income | expense | savings | debt`.', example: 'expense' }) kind: string;
  @ApiProperty({ example: '#3b82f6', nullable: true }) icon: string | null;
  @ApiProperty({ example: '#3b82f6', nullable: true }) color: string | null;
  @ApiProperty({ description: 'Presupuesto del mes.', example: 4000 }) budget: number;
  @ApiProperty({ description: 'Gasto/ingreso real del mes.', example: 3250.5 }) actual: number;
  @ApiProperty({ description: '`actual − budget`. En egresos positivo = sobregiro.', example: -749.5 }) variance: number;
  @ApiProperty({ description: '`actual / budget * 100` (null sin presupuesto).', example: 81.26, nullable: true }) executionRate: number | null;
  @ApiProperty({ description: '`within | near (≥90%) | exceeded | unbudgeted | met | below`.', example: 'within' }) status: string;
  @ApiProperty({ description: 'Partidas (solo en rubros).', type: [BudgetLineResponseDto], required: false }) items?: BudgetLineResponseDto[];
}

export class DistributionItemResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Gastos' }) name: string;
  @ApiProperty({ example: 'expense' }) kind: string;
  @ApiProperty({ example: '#3b82f6', nullable: true }) color: string | null;
  @ApiProperty({ example: 3250.5 }) amount: number;
  @ApiProperty({ description: '% del gasto total.', example: 42.5 }) percent: number;
}

export class WaterfallStepResponseDto {
  @ApiProperty({ example: 'Sueldo' }) label: string;
  @ApiProperty({ description: '`increase | decrease | total`.', example: 'increase' }) type: string;
  @ApiProperty({ description: 'Monto con signo (ingresos +, egresos −).', example: 20100 }) amount: number;
  @ApiProperty({ example: 0 }) start: number;
  @ApiProperty({ example: 20100 }) end: number;
}

/** `GET /reports/dashboard` — Resumen Financiero Ejecutivo. */
export class DashboardResponseDto {
  @ApiProperty({ type: PeriodResponseDto }) period: PeriodResponseDto;
  @ApiProperty({
    example: {
      income: 20100, incomeBudget: 20000, incomeVariance: 100, incomeExecutionRate: 100.5,
      expense: 26619, expenseBudget: 25000, expenseVariance: 1619, expenseExecutionRate: 106.48,
      net: -6519, isDeficit: true, saved: 1500, debtPayments: 2000,
    },
  })
  totals: Record<string, number | boolean | null>;
  @ApiProperty({
    example: {
      items: [{ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Nómina BBVA', type: 'checking', isPrimary: true, balance: 18450.75 }],
      liquid: 22000, total: 25000,
    },
  })
  accounts: object;
  @ApiProperty({ example: { payable: 38000, receivable: 5000 } }) liabilities: object;
  @ApiProperty({ description: 'Patrimonio neto = cuentas + por cobrar − por pagar.', example: -8000 }) netWorth: number;
  @ApiProperty({ description: 'Movimientos pendientes de conciliar.', example: 4 }) pendingTransactions: number;
  @ApiProperty({ type: [DistributionItemResponseDto] }) distribution: DistributionItemResponseDto[];
  @ApiProperty({ type: [BudgetLineResponseDto] }) incomeRubros: BudgetLineResponseDto[];
  @ApiProperty({ type: [BudgetLineResponseDto] }) expenseRubros: BudgetLineResponseDto[];
  @ApiProperty({ example: { steps: [{ label: 'Sueldo', type: 'increase', amount: 20100, start: 0, end: 20100 }] } }) waterfall: object;
}

/** `GET /reports/budget-overview` — Presupuesto vs real. */
export class BudgetOverviewResponseDto {
  @ApiProperty({ type: PeriodResponseDto }) period: PeriodResponseDto;
  @ApiProperty({ example: { planned: 25000, executed: 26619, remaining: -1619, executionRate: 106.48 } }) totals: object;
  @ApiProperty({ example: { all: 6, within: 4, near: 1, exceeded: 1 } }) counts: object;
  @ApiProperty({ type: [BudgetLineResponseDto] }) rubros: BudgetLineResponseDto[];
}

/** `GET /reports/analytics` — Analíticas y proyecciones. */
export class AnalyticsResponseDto {
  @ApiProperty({ type: PeriodResponseDto }) period: PeriodResponseDto;
  @ApiProperty({
    type: 'array',
    example: [{ period: '2025-10', income: 20100, expense: 26619, net: -6519, saved: 1500, budgetExpense: 25000 }],
  })
  cashflow: object[];
  @ApiProperty({
    example: {
      savingsRate: 7.46, savingsTargetPercent: 15, savingsGap: 1515, liquid: 22000,
      averageMonthlyExpense: 24000, runwayMonths: 0.92, expenseDeviation: 1619, expenseMoM: 5.2, averageIncome: 19800,
    },
  })
  kpis: object;
  @ApiProperty({
    type: 'array',
    example: [{ categoryId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', name: 'Gastos', actual: 8000, budget: 7000, variance: 1000, percentOfExpense: 30.05, status: 'exceeded' }],
  })
  leakage: object[];
  @ApiProperty({
    type: 'array',
    example: [{ categoryId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', title: 'Sobregiro en Súper', severity: 'moderate', actual: 4500, budget: 4000, overspend: 500 }],
  })
  alerts: object[];
}
