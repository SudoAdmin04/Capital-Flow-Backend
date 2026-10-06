import { ApiProperty } from '@nestjs/swagger';

/** Rango resuelto (mensual, trimestral o anual). */
export class DashboardRangeResponseDto {
  @ApiProperty({ example: 2025 }) year: number;
  @ApiProperty({ example: 10 }) month: number;
  @ApiProperty({ description: 'Granularidad aplicada.', example: 'monthly' }) granularity: string;
  @ApiProperty({ description: 'Etiqueta para el header (ej. "Octubre 2025").', example: 'Octubre 2025' }) label: string;
  @ApiProperty({ description: 'Inicio del rango (inclusivo).', example: '2025-10-01' }) from: string;
  @ApiProperty({ description: 'Fin del rango (inclusivo).', example: '2025-10-31' }) to: string;
}

/** Fila de las tablas Resumen Ingresos / Resumen Egresos. */
export class DashboardSummaryRowDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Sueldo' }) name: string;
  @ApiProperty({ description: '`income | expense | savings | debt`.', example: 'income' }) kind: string;
  @ApiProperty({ example: '#4edea3', nullable: true }) color: string | null;
  @ApiProperty({ description: 'Presupuesto sumado en el rango.', example: 6000 }) budget: number;
  @ApiProperty({ description: 'Monto real en el rango.', example: 5800 }) actual: number;
  @ApiProperty({ description: '`actual − budget`.', example: -200 }) variance: number;
  @ApiProperty({ description: '`actual / budget * 100` (null sin presupuesto).', example: 96.67, nullable: true }) executionRate: number | null;
  @ApiProperty({ description: '`within | near | exceeded | unbudgeted | met | below`.', example: 'below' }) status: string;
}

/** KPI Saldo Neto (card 1). */
export class NetBalanceKpiDto {
  @ApiProperty({ description: 'Ingresos − egresos del rango.', example: -6519 }) net: number;
  @ApiProperty({ description: '`true` si el neto es negativo (badge Déficit).', example: true }) isDeficit: boolean;
  @ApiProperty({ description: 'Texto del badge: `Déficit` o `Superávit`.', example: 'Déficit' }) label: string;
  @ApiProperty({ description: 'Ingresos usados en el cálculo.', example: 20100 }) income: number;
  @ApiProperty({ description: 'Egresos usados en el cálculo.', example: 26619 }) expense: number;
  @ApiProperty({ description: 'Texto "Saldo Calculado" de la card.', example: '$20,100 - $26,619' }) detail: string;
}

/** KPI Ingresos / Egresos (cards 2 y 3). */
export class TotalKpiDto {
  @ApiProperty({ example: 20100 }) total: number;
  @ApiProperty({ description: 'Presupuesto total del rango.', example: 20200 }) budget: number;
  @ApiProperty({ description: '`total − budget`.', example: -100 }) variance: number;
  @ApiProperty({ description: '`total / budget * 100` (null sin presupuesto).', example: 99.5, nullable: true }) executionRate: number | null;
  @ApiProperty({ description: 'Texto del badge (ej. "99.5% meta", "+19.2% exceso").', example: '99.5% meta' }) badge: string;
}

/** Disponibilidad en cuentas (card 4). */
export class LiquidityAccountDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }) id: string;
  @ApiProperty({ example: 'Cuenta Banco (Principal)' }) name: string;
  @ApiProperty({ description: '`checking | savings | cash | credit_card`.', example: 'checking' }) type: string;
  @ApiProperty({ example: true }) isPrimary: boolean;
  @ApiProperty({ example: 12450 }) balance: number;
}

export class LiquidityResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: [LiquidityAccountDto] }) items: LiquidityAccountDto[];
  @ApiProperty({ description: 'Suma de checking+savings+cash activas.', example: 20830 }) liquid: number;
  @ApiProperty({ description: 'Suma de todas las activas (incluye tarjetas).', example: 20830 }) total: number;
}

/** Donut Distribución de Gastos. */
export class ExpenseDistributionItemDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Gastos' }) name: string;
  @ApiProperty({ example: 'expense' }) kind: string;
  @ApiProperty({ example: '#4d8eff', nullable: true }) color: string | null;
  @ApiProperty({ example: 15144 }) amount: number;
  @ApiProperty({ description: '% del gasto total.', example: 57 }) percent: number;
}

export class ExpenseDistributionResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ description: 'Total egresos del rango (centro del donut).', example: 26619 }) total: number;
  @ApiProperty({ type: [ExpenseDistributionItemDto] }) items: ExpenseDistributionItemDto[];
}

/** Barras Presupuesto VS Ingreso (por rubro de ingreso). */
export class IncomeBarItemDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Sueldo' }) name: string;
  @ApiProperty({ description: 'Barra gris (Ppto).', example: 6000 }) budget: number;
  @ApiProperty({ description: 'Barra azul (Real).', example: 5800 }) actual: number;
  @ApiProperty({ example: -200 }) variance: number;
  @ApiProperty({ example: 96.67, nullable: true }) executionRate: number | null;
}

export class IncomeVsBudgetResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: [IncomeBarItemDto] }) items: IncomeBarItemDto[];
  @ApiProperty({ description: 'Suma presupuestos de ingreso.', example: 20200 }) totalBudget: number;
  @ApiProperty({ description: 'Suma reales de ingreso.', example: 20100 }) totalActual: number;
  @ApiProperty({ description: '% cumplimiento total.', example: 99.5, nullable: true }) complianceRate: number | null;
}

/** Waterfall Variación Neta. */
export class WaterfallStepDto {
  @ApiProperty({ example: 'Sueldo' }) label: string;
  @ApiProperty({ description: '`increase (verde) | decrease (rojo) | total`.', example: 'decrease' }) type: string;
  @ApiProperty({ description: 'Monto con signo.', example: -5800 }) amount: number;
  @ApiProperty({ example: 0 }) start: number;
  @ApiProperty({ example: -5800 }) end: number;
}

export class WaterfallResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: [WaterfallStepDto] }) steps: WaterfallStepDto[];
  @ApiProperty({ description: 'Cierre ajustado (flujo bruto).', example: -6519 }) total: number;
}

/** Tablas Resumen Ingresos / Resumen Egresos. */
export class LedgerSummaryResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: [DashboardSummaryRowDto] }) rows: DashboardSummaryRowDto[];
  @ApiProperty({ description: 'Suma presupuestos.', example: 20200 }) totalBudget: number;
  @ApiProperty({ description: 'Suma reales.', example: 20100 }) totalActual: number;
  @ApiProperty({ description: 'Suma desviaciones.', example: -100 }) totalVariance: number;
  @ApiProperty({ description: 'Rubros activos en el rango.', example: 3 }) activeCount: number;
}

/** Desglose de un rubro por partidas (card Servicios). */
export class CategoryBreakdownItemDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }) categoryId: string;
  @ApiProperty({ example: 'Renta departamento' }) name: string;
  @ApiProperty({ example: 'wifi', nullable: true }) icon: string | null;
  @ApiProperty({ description: 'Real en el rango.', example: 6700 }) actual: number;
  @ApiProperty({ description: 'Presupuesto en el rango.', example: 6700 }) budget: number;
  @ApiProperty({ example: 0 }) variance: number;
  @ApiProperty({ description: 'Badge de la fila (ej. "+27%", "Al día").', example: 'Al día' }) badge: string;
  @ApiProperty({ description: '`within | near | exceeded | unbudgeted | met | below`.', example: 'within' }) status: string;
}

export class CategoryBreakdownResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ description: 'Rubro desglosado.', example: { id: 'x', name: 'Servicios', kind: 'expense' } }) rubro: object;
  @ApiProperty({ type: [CategoryBreakdownItemDto] }) items: CategoryBreakdownItemDto[];
  @ApiProperty({ description: 'Total real del rubro.', example: 7975 }) totalActual: number;
  @ApiProperty({ description: 'Total presupuesto del rubro.', example: 8020 }) totalBudget: number;
  @ApiProperty({ description: 'Texto del footer (ej. "Dentro de margen (-$45)").', example: 'Dentro de margen (-$45)' }) footer: string;
}

/** Deudas & Pasivos (card Deudas). */
export class DebtsSnapshotResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ description: 'Total por pagar vigente.', example: 3000 }) payable: number;
  @ApiProperty({ description: 'Total por cobrar vigente.', example: 0 }) receivable: number;
  @ApiProperty({
    type: 'array',
    example: [{ id: 'x', name: 'Dinero Prestado', outstanding: 3000, dueDate: '2025-10-15', status: 'open' }],
  })
  items: object[];
  @ApiProperty({ description: 'Medio más usado en abonos del rango (ej. "Transferencia Directa").', example: 'Transferencia Directa', nullable: true }) topMethod: string | null;
  @ApiProperty({ description: 'Total amortizado en el rango.', example: 3000 }) amortizedInRange: number;
}

/** Ahorro Semanal & Metas + Métodos de pago. */
export class SavingsSnapshotResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({
    type: 'array',
    example: [{ goalId: 'x', name: 'Ahorro Semanal', contributed: 500, monthlyTarget: 500, percent: 100 }],
  })
  goals: object[];
  @ApiProperty({ description: 'Ahorro total del rango (egresos kind=savings).', example: 500 }) totalSaved: number;
  @ApiProperty({ description: 'Meta total del rango.', example: 500 }) totalTarget: number;
  @ApiProperty({
    type: 'array',
    example: [{ method: 'bank_transfer', label: 'Transferencia Directa', total: 3000, count: 5 }],
  })
  paymentMethods: object[];
  @ApiProperty({
    type: 'array',
    example: [{ id: 'x', name: 'Banco Principal', type: 'checking', balance: 12450 }],
  })
  linkedAccounts: object[];
}

/** KPIs fila 1 (4 cards). */
export class DashboardKpisResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: NetBalanceKpiDto }) net: NetBalanceKpiDto;
  @ApiProperty({ description: 'Card Ingresos Totales.', type: TotalKpiDto }) income: TotalKpiDto;
  @ApiProperty({ description: 'Card Egresos Totales.', type: TotalKpiDto }) expense: TotalKpiDto;
  @ApiProperty({ type: LiquidityResponseDto }) liquidity: LiquidityResponseDto;
}

/** Overview compuesto (carga inicial del Dashboard con todos los widgets). */
export class DashboardOverviewResponseDto {
  @ApiProperty({ type: DashboardRangeResponseDto }) range: DashboardRangeResponseDto;
  @ApiProperty({ type: DashboardKpisResponseDto }) kpis: DashboardKpisResponseDto;
  @ApiProperty({ type: ExpenseDistributionResponseDto }) distribution: ExpenseDistributionResponseDto;
  @ApiProperty({ type: IncomeVsBudgetResponseDto }) incomeVsBudget: IncomeVsBudgetResponseDto;
  @ApiProperty({ type: WaterfallResponseDto }) waterfall: WaterfallResponseDto;
  @ApiProperty({ type: LedgerSummaryResponseDto }) incomeSummary: LedgerSummaryResponseDto;
  @ApiProperty({ type: LedgerSummaryResponseDto }) expenseSummary: LedgerSummaryResponseDto;
}
