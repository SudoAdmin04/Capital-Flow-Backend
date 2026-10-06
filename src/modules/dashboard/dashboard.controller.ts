import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CategoryBreakdownQueryDto, DashboardQueryDto } from './dto/dashboard-query.dto';
import {
  CategoryBreakdownResponseDto,
  DashboardKpisResponseDto,
  DashboardOverviewResponseDto,
  DebtsSnapshotResponseDto,
  ExpenseDistributionResponseDto,
  IncomeVsBudgetResponseDto,
  LedgerSummaryResponseDto,
  LiquidityResponseDto,
  SavingsSnapshotResponseDto,
  WaterfallResponseDto,
} from './dto/dashboard-response.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Overview compuesto (carga inicial)',
    description:
      'Devuelve en una sola llamada todos los widgets del mockup: KPIs fila 1, donut, barras Ppto vs Ingreso, waterfall y tablas Resumen Ingresos/Egresos. Usa `granularity` (monthly/quarterly/annual) y filtros `accountId`/`paymentMethod`.',
  })
  @ResponseMessage('Resumen general obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Dashboard completo del rango.',
    type: DashboardOverviewResponseDto,
    message: 'Resumen general obtenido exitosamente',
  })
  overview(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.overview(user.userId, q);
  }

  @Get('kpis')
  @ApiOperation({
    summary: 'KPIs fila 1 (4 cards)',
    description:
      'Card 1 Saldo Neto (`net`, `isDeficit`, badge Déficit/Superávit); card 2 Ingresos; card 3 Egresos; card 4 Disponibilidad. Respeta `granularity` y filtros.',
  })
  @ResponseMessage('KPIs obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'KPIs del rango.',
    type: DashboardKpisResponseDto,
    message: 'KPIs obtenidos exitosamente',
  })
  kpis(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.kpis(user.userId, q);
  }

  @Get('liquidity')
  @ApiOperation({
    summary: 'Disponibilidad en cuentas (card 4)',
    description:
      'Desglose por cuenta con `balance` calculado + `liquid` (checking+savings+cash) y `total`. Si pasas `accountId` devuelve solo esa cuenta.',
  })
  @ResponseMessage('Disponibilidad obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Disponibilidad y lista de cuentas.',
    type: LiquidityResponseDto,
    message: 'Disponibilidad obtenida exitosamente',
  })
  liquidity(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.liquidity(user.userId, q);
  }

  @Get('expense-distribution')
  @ApiOperation({
    summary: 'Distribución de gastos (donut)',
    description: 'Participación porcentual del gasto total por rubro. Centro = `total`. Las transferencias no cuentan.',
  })
  @ResponseMessage('Distribución de gastos obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Donut por rubro con `amount` y `percent`.',
    type: ExpenseDistributionResponseDto,
    message: 'Distribución de gastos obtenida exitosamente',
  })
  distribution(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.expenseDistribution(user.userId, q);
  }

  @Get('income-vs-budget')
  @ApiOperation({
    summary: 'Presupuesto VS Ingreso (barras)',
    description: 'Comparativa por rubro de ingreso + `complianceRate` total.',
  })
  @ResponseMessage('Comparativo de ingresos obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Barras por rubro con cumplimiento total.',
    type: IncomeVsBudgetResponseDto,
    message: 'Comparativo de ingresos obtenido exitosamente',
  })
  incomeVsBudget(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.incomeVsBudget(user.userId, q);
  }

  @Get('waterfall')
  @ApiOperation({
    summary: 'Variación Neta (waterfall)',
    description: 'Cascada: ingresos en verde (`increase`), egresos en rojo (`decrease`) y `Total` de cierre (= neto real).',
  })
  @ResponseMessage('Cascada obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Pasos de la cascada con total.',
    type: WaterfallResponseDto,
    message: 'Cascada obtenida exitosamente',
  })
  waterfall(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.waterfall(user.userId, q);
  }

  @Get('income-summary')
  @ApiOperation({ summary: 'Resumen Ingresos (tabla)', description: 'Filas por rubro con totales y `activeCount`.' })
  @ResponseMessage('Resumen de ingresos obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Tabla de ingresos con totales.',
    type: LedgerSummaryResponseDto,
    message: 'Resumen de ingresos obtenido exitosamente',
  })
  incomeSummary(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.incomeSummary(user.userId, q);
  }

  @Get('expense-summary')
  @ApiOperation({ summary: 'Resumen Egresos (tabla)', description: 'Filas por rubro con estados y totales.' })
  @ResponseMessage('Resumen de egresos obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Tabla de egresos con estados.',
    type: LedgerSummaryResponseDto,
    message: 'Resumen de egresos obtenido exitosamente',
  })
  expenseSummary(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.expenseSummary(user.userId, q);
  }

  @Get('category-breakdown')
  @ApiOperation({
    summary: 'Desglose por partidas (card Servicios)',
    description:
      'Detalle de un rubro por partidas con icono, real, ppto y badge + `totalActual/totalBudget` y `footer`. Sin `categoryId` usa el rubro de egreso con más movimiento.',
  })
  @ResponseMessage('Desglose por categoría obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Partidas del rubro con totales.',
    type: CategoryBreakdownResponseDto,
    message: 'Desglose por categoría obtenido exitosamente',
  })
  breakdown(@UsuarioActual() user: AuthUser, @Query() q: CategoryBreakdownQueryDto) {
    return this.service.categoryBreakdown(user.userId, q);
  }

  @Get('debts-snapshot')
  @ApiOperation({ summary: 'Deudas & Pasivos (card)', description: 'Pasivos vigentes con saldo vivo y amortizado en el rango.' })
  @ResponseMessage('Resumen de deudas obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Snapshot de deudas del rango.',
    type: DebtsSnapshotResponseDto,
    message: 'Resumen de deudas obtenido exitosamente',
  })
  debts(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.debtsSnapshot(user.userId, q);
  }

  @Get('savings-snapshot')
  @ApiOperation({ summary: 'Ahorro & Métodos de pago (card)', description: 'Metas con avance del rango y medios de pago.' })
  @ResponseMessage('Resumen de ahorro obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Ahorro y medios del rango.',
    type: SavingsSnapshotResponseDto,
    message: 'Resumen de ahorro obtenido exitosamente',
  })
  savings(@UsuarioActual() user: AuthUser, @Query() q: DashboardQueryDto) {
    return this.service.savingsSnapshot(user.userId, q);
  }
}
