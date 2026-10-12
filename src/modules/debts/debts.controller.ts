import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { DebtStatus } from '../../common/enums';
import { DebtsService } from './debts.service';
import { CreateDebtDto, DebtResponseDto, DebtStatsResponseDto, UpdateDebtDto } from './dto/debt.dto';

class DebtsQuery {
  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;
}

@ApiTags('debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar deudas',
    description:
      'Devuelve pasivos con `paidAmount` (suma de movimientos vinculados) y `outstanding` (`principal − pagado`). Ordenados por estado, vencimiento y creación. Filtra con `?status=open|paid`.',
  })
  @ApiQuery({ name: 'status', required: false, enum: DebtStatus, description: 'Filtra por estado.' })
  @ResponseMessage('Deudas obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de deudas con saldo vivo calculado.',
    type: DebtResponseDto,
    isArray: true,
    message: 'Deudas obtenidas exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser, @Query() q: DebtsQuery) {
    return this.service.findAll(user.userId, q.status);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Stats para cards de deudas',
    description:
      'Agregados para las 4 cards: `porPagar` (yo debo), `porCobrar` (me deben), `saldoVivoVigente` (total + principal) y `vencidas` (`dueDate < hoy`). Solo considera `status=open`; `outstanding = max(principal − pagado, 0)`.',
  })
  @ResponseMessage('Estadísticas de deudas obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Stats de deudas vigentes.',
    type: DebtStatsResponseDto,
    message: 'Estadísticas de deudas obtenidas exitosamente',
  })
  stats(@UsuarioActual() user: AuthUser) {
    return this.service.stats(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una deuda', description: 'Devuelve la deuda con `paidAmount` y `outstanding`.' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda.', format: 'uuid' })
  @ResponseMessage('Deuda obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Deuda encontrada.',
    type: DebtResponseDto,
    message: 'Deuda obtenida exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una deuda',
    description:
      '`payable` = yo debo (resta al patrimonio neto); `receivable` = me deben (suma). Registra abonos creando movimientos con `debtId`.',
  })
  @ResponseMessage('Deuda creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Deuda creada.',
    type: DebtResponseDto,
    message: 'Deuda creada exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateDebtDto) {
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una deuda', description: 'Actualización parcial (nombre, montos, vencimiento, estado).' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda.', format: 'uuid' })
  @ResponseMessage('Deuda actualizada exitosamente')
  @ApiGlobalResponse({
    description: 'Deuda actualizada con saldos recalculados.',
    type: DebtResponseDto,
    message: 'Deuda actualizada exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDebtDto) {
    return this.service.update(user.userId, id, dto);
  }

  /** Marca el pasivo como liquidado. */
  @Post(':id/settle')
  @ApiOperation({
    summary: 'Liquidar una deuda',
    description: 'Atajo para `PATCH { status: "paid" }`. Marca el pasivo como liquidado (no valida que el saldo sea cero).',
  })
  @ApiParam({ name: 'id', description: 'UUID de la deuda.', format: 'uuid' })
  @ResponseMessage('Deuda liquidada exitosamente')
  @ApiGlobalResponse({
    description: 'Deuda marcada como pagada.',
    type: DebtResponseDto,
    message: 'Deuda liquidada exitosamente',
  })
  settle(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.settle(user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una deuda', description: 'Borrado físico (no borra los movimientos que la referencian).' })
  @ApiParam({ name: 'id', description: 'UUID de la deuda.', format: 'uuid' })
  @ResponseMessage('Deuda eliminada exitosamente')
  @ApiGlobalResponse({
    description: 'Deuda eliminada.',
    message: 'Deuda eliminada exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
