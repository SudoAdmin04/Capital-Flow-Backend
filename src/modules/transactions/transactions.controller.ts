import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import {
  CreateTransactionDto,
  ExpenseDistributionResponseDto,
  IncomeSourcesResponseDto,
  PaginatedTransactionsResponseDto,
  QueryTransactionSummaryDto,
  QueryTransactionsDto,
  ReconcileBatchDto,
  ReconcileResponseDto,
  TransactionResponseDto,
  TransactionSummaryResponseDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar movimientos con filtros',
    description:
      'Pagina y filtra por fechas, tipo, estado, medio de pago, categoría (un rubro incluye sus partidas), cuenta (origen o destino) y texto. Orden por fecha contable. Respuesta `{ items, total, page, limit, pages }` con cuenta, destino, categoría y deuda relacionadas.',
  })
  @ResponseMessage('Movimientos obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Página de movimientos.',
    type: PaginatedTransactionsResponseDto,
    message: 'Movimientos obtenidos exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser, @Query() query: QueryTransactionsDto) {
    return this.service.findAll(user.userId, query);
  }

  /** Resumen para las cartas de stats (ingresos, egresos, neto, por conciliar/deuda). Debe ir antes de `:id`. */
  @Get('summary')
  @ApiOperation({
    summary: 'Resumen de movimientos para cartas de stats',
    description:
      'Agrega los movimientos del usuario bajo los mismos filtros de alcance del listado (`from, to, accountId, categoryId, paymentMethod, search`) y devuelve `income` (ej. $20,100), `expense` (ej. $26,619), `net` (`ingresos - egresos`, ej. -$6,519 + `isDeficit/status`), `pending` (por conciliar), `reconciled`, `transfers` (excluidas del neto) y `debts` (`openCount/payable/receivable`, ej. Dinero Prestado $3,000). Si `from/to` son del mismo mes (o no se envían, mes actual) incluye `budget/variance/executionRate` contra `budgets`. Las transferencias nunca suman a ingresos/egresos.',
  })
  @ResponseMessage('Resumen de movimientos obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Resumen para las cartas de stats.',
    type: TransactionSummaryResponseDto,
    message: 'Resumen de movimientos obtenido exitosamente',
  })
  getSummary(@UsuarioActual() user: AuthUser, @Query() query: QueryTransactionSummaryDto) {
    return this.service.getSummary(user.userId, query);
  }

  /** Componente "Distribución de Gastos" (barra + filas por rubro). Debe ir antes de `:id`. */
  @Get('expenses-distribution')
  @ApiOperation({
    summary: 'Distribución de gastos por rubro',
    description:
      'Agrupa egresos por rubro (partidas → rubro) bajo los filtros `from, to, accountId, categoryId, paymentMethod, search` y devuelve `total` (ej. $26,619), `budgetTotal` (ej. $22,331, presupuestos no-`income` del mes si el rango es mes único), `variance/isOverBudget` (ej. Exceso +$4,288) e `items` con `amount/percent/count/budget/variance` (ej. Gastos generales $15,144 57%). Ideal para la barra segmentada 0–100% y las filas con color.',
  })
  @ResponseMessage('Distribución de gastos obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Distribución para el componente de gastos.',
    type: ExpenseDistributionResponseDto,
    message: 'Distribución de gastos obtenida exitosamente',
  })
  getExpensesDistribution(@UsuarioActual() user: AuthUser, @Query() query: QueryTransactionSummaryDto) {
    return this.service.getExpensesDistribution(user.userId, query);
  }

  /** Componente "Fuentes de Ingreso" (barras actual vs meta). Debe ir antes de `:id`. */
  @Get('income-sources')
  @ApiOperation({
    summary: 'Fuentes de ingreso contra metas',
    description:
      'Agrupa ingresos por rubro bajo los mismos filtros y devuelve `total` (ej. $20,100), `budgetTotal` (metas `income` del mes), `complianceRate` (ej. 99.5%) e `items` con `actual/budget/variance/executionRate/label` (ej. Sueldo Base +$5,800 / $6,000). Ideal para barras actual vs meta.',
  })
  @ResponseMessage('Fuentes de ingreso obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Fuentes para el componente de ingresos.',
    type: IncomeSourcesResponseDto,
    message: 'Fuentes de ingreso obtenidas exitosamente',
  })
  getIncomeSources(@UsuarioActual() user: AuthUser, @Query() query: QueryTransactionSummaryDto) {
    return this.service.getIncomeSources(user.userId, query);
  }

  /** Concilia varios movimientos pendientes ("Conciliar lote"). */
  @Post('reconcile')  @ApiOperation({
    summary: 'Conciliar un lote',
    description: 'Marca como `reconciled` (con `reconciledAt`) hasta 200 movimientos en estado `pending`. Devuelve `{ updated }`.',
  })
  @ResponseMessage('Movimientos conciliados exitosamente')
  @ApiGlobalResponse({
    description: 'Lote conciliado.',
    type: ReconcileResponseDto,
    message: 'Movimientos conciliados exitosamente',
  })
  reconcile(@UsuarioActual() user: AuthUser, @Body() dto: ReconcileBatchDto) {
    return this.service.reconcile(user.userId, dto.ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento', description: 'Devuelve el movimiento con sus relaciones.' })
  @ApiParam({ name: 'id', description: 'UUID del movimiento.', format: 'uuid' })
  @ResponseMessage('Movimiento obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Movimiento encontrado.',
    type: TransactionResponseDto,
    message: 'Movimiento obtenido exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un movimiento',
    description:
      'Reglas: `income` exige categoría `income`; `expense` exige categoría no-`income`; `transfer` exige `destinationAccountId` distinta y prohíbe `categoryId`. `amount` siempre > 0. `status` por defecto `pending`. Puede vincularse a una deuda con `debtId`. El movimiento siempre queda ligado a una cuenta del usuario.',
  })
  @ResponseMessage('Movimiento registrado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Movimiento creado.',
    type: TransactionResponseDto,
    message: 'Movimiento registrado exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un movimiento',
    description:
      'Actualización parcial con las mismas reglas de creación. Cambiar a `transfer` limpia la categoría; dejar de serlo limpia el destino. Cambiar `status` ajusta `reconciledAt`.',
  })
  @ApiParam({ name: 'id', description: 'UUID del movimiento.', format: 'uuid' })
  @ResponseMessage('Movimiento actualizado exitosamente')
  @ApiGlobalResponse({
    description: 'Movimiento actualizado.',
    type: TransactionResponseDto,
    message: 'Movimiento actualizado exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un movimiento', description: 'Borrado físico. Afecta saldos, reportes y saldos de deudas.' })
  @ApiParam({ name: 'id', description: 'UUID del movimiento.', format: 'uuid' })
  @ResponseMessage('Movimiento eliminado exitosamente')
  @ApiGlobalResponse({
    description: 'Movimiento eliminado.',
    message: 'Movimiento eliminado exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
