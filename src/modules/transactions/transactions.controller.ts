import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import {
  CreateTransactionDto,
  PaginatedTransactionsResponseDto,
  QueryTransactionsDto,
  ReconcileBatchDto,
  ReconcileResponseDto,
  TransactionResponseDto,
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

  /** Concilia varios movimientos pendientes ("Conciliar lote"). */
  @Post('reconcile')
  @ApiOperation({
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
