import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { AnalyticsQueryDto, AnalyticsResponseDto, BudgetOverviewResponseDto, DashboardResponseDto, PeriodQueryDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  /** KPIs, distribución de gastos, waterfall, disponibilidad y tablas por rubro. */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Resumen ejecutivo del mes',
    description:
      'Pantalla Dashboard: `totals` (ingreso, gasto, neto, ¿déficit?, ahorro, pagos de deuda con presupuesto/varianza/ejecución), `accounts` (saldos, liquidez = checking+savings+cash, total), `liabilities` (por pagar/cobrar), `netWorth` (= cuentas + cobrar − pagar), `pendingTransactions`, `distribution` (donut %), `incomeRubros/expenseRubros` y `waterfall` (ingresos suben, egresos bajan, cierre = neto). Sin `year/month` usa el mes actual. Las transferencias no cuentan como ingreso/gasto.',
  })
  @ResponseMessage('Resumen del mes obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Dashboard del periodo con KPIs, donut, waterfall y patrimonio.',
    type: DashboardResponseDto,
    message: 'Resumen del mes obtenido exitosamente',
  })
  dashboard(@UsuarioActual() user: AuthUser, @Query() q: PeriodQueryDto) {
    return this.service.dashboard(user.userId, q);
  }

  /** Presupuesto vs real por rubro y partida (pantalla Presupuestos). */
  @Get('budget-overview')
  @ApiOperation({
    summary: 'Presupuesto vs real',
    description:
      'Pantalla Presupuestos: `totals` (planeado, ejecutado, restante, % ejecución), `counts` (rubros en orden/cerca/excedidos) y `rubros` con `budget, actual, variance (= actual − budget), executionRate, status (within|near|exceeded|unbudgeted|met|below)` y `items` por partida. Presupuesto del rubro = propio + partidas. Excluye rubros `income`.',
  })
  @ResponseMessage('Comparativo de presupuesto obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Comparativo del mes con desglose por partidas.',
    type: BudgetOverviewResponseDto,
    message: 'Comparativo de presupuesto obtenido exitosamente',
  })
  budgetOverview(@UsuarioActual() user: AuthUser, @Query() q: PeriodQueryDto) {
    return this.service.budgetOverview(user.userId, q);
  }

  /** Cash flow histórico, tasa de ahorro, runway, fugas y alertas. */
  @Get('analytics')
  @ApiOperation({
    summary: 'Analíticas y proyecciones',
    description:
      'Pantalla Analíticas: `cashflow` mensual (`income, expense, net, saved, budgetExpense`), `kpis` (`savingsRate, savingsTargetPercent, savingsGap, liquid, averageMonthlyExpense, runwayMonths = liquidez/promedio, expenseDeviation, expenseMoM, averageIncome`), `leakage` (rubros por monto con % del gasto y estado) y `alerts` (partidas/rubros `exceeded|unbudgeted` con severidad `moderate (>100%)|high (>125%)`). Parámetros: `months` (2-24, defecto 6), `savingsTargetPercent` (0-100, defecto 15).',
  })
  @ResponseMessage('Analíticas obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Analíticas con cashflow, KPIs, fugas y alertas.',
    type: AnalyticsResponseDto,
    message: 'Analíticas obtenidas exitosamente',
  })
  analytics(@UsuarioActual() user: AuthUser, @Query() q: AnalyticsQueryDto) {
    return this.service.analytics(user.userId, q);
  }
}
