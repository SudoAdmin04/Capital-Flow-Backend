import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import {
  CreateSavingsGoalDto,
  DepositSavingsGoalDto,
  GoalProgressQueryDto,
  GoalProgressResponseDto,
  QueryGoalEntriesDto,
  SavingsGoalBalanceResponseDto,
  SavingsGoalEntryResponseDto,
  SavingsGoalResponseDto,
  UpdateSavingsGoalDto,
  WithdrawSavingsGoalDto,
} from './dto/savings-goal.dto';
import { SavingsGoalsService } from './savings-goals.service';

@ApiTags('savings-goals')
@ApiBearerAuth()
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly service: SavingsGoalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar metas de ahorro',
    description: 'Devuelve todas mis metas con su cuenta y categoría asociadas, ordenadas por nombre.',
  })
  @ResponseMessage('Metas de ahorro obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de metas.',
    type: SavingsGoalResponseDto,
    isArray: true,
    message: 'Metas de ahorro obtenidas exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser) {
    return this.service.findAll(user.userId);
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Avance de metas en el mes',
    description:
      'Para cada meta activa calcula `contributed` (neto del mes: depósitos − retiros del ledger; si la meta aún no tiene movimientos usa el fallback de egresos en su categoría), `monthlyTarget`, `percent`, `remaining`, `totalContributed` (neto histórico) y `targetProgressPercent` (vs `targetAmount`). Requiere `year` y `month`.',
  })
  @ResponseMessage('Avance de metas obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Avance mensual por meta.',
    type: GoalProgressResponseDto,
    isArray: true,
    message: 'Avance de metas obtenido exitosamente',
  })
  progress(@UsuarioActual() user: AuthUser, @Query() q: GoalProgressQueryDto) {
    return this.service.progress(user.userId, q);
  }

  @Get(':id/balance')
  @ApiOperation({
    summary: 'Saldo de una meta',
    description: 'Saldo neto del ledger (`depósitos − retiros`) más totales históricos y número de movimientos.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Saldo de la meta obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Saldo de la meta.',
    type: SavingsGoalBalanceResponseDto,
    message: 'Saldo de la meta obtenido exitosamente',
  })
  balance(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.balance(user.userId, id);
  }

  @Get(':id/entries')
  @ApiOperation({
    summary: 'Historial de aportes y retiros',
    description: 'Ledger auditable de la meta (más recientes primero). Filtros opcionales `from`/`to` (YYYY-MM-DD).',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Movimientos de la meta obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Historial del ledger.',
    type: SavingsGoalEntryResponseDto,
    isArray: true,
    message: 'Movimientos de la meta obtenidos exitosamente',
  })
  entries(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() q: QueryGoalEntriesDto) {
    return this.service.listEntries(user.userId, id, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una meta', description: 'Devuelve la meta con su cuenta y categoría.' })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Meta de ahorro obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Meta encontrada.',
    type: SavingsGoalResponseDto,
    message: 'Meta de ahorro obtenida exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una meta',
    description:
      'Crea una meta con aporte mensual y opcionalmente cuenta reserva (`accountId`, donde vive el dinero real) y categoría (`categoryId`, solo fallback de metas sin ledger). `accountId` y `categoryId` deben ser propios. El avance se alimenta con `POST /savings-goals/:id/deposits`.',
  })
  @ResponseMessage('Meta de ahorro creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Meta creada.',
    type: SavingsGoalResponseDto,
    message: 'Meta de ahorro creada exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateSavingsGoalDto) {
    return this.service.create(user.userId, dto);
  }

  @Post(':id/deposits')
  @ApiOperation({
    summary: 'Aportar a una meta',
    description:
      'Registra un aporte en el ledger y mueve dinero real con un `transfer` operativa → reserva (si la meta tiene `accountId`). Aumenta `contributed`/`totalContributed` de `GET /savings-goals/progress`. Ejemplo: `{amount:1500, date:"2025-10-05", fromAccountId:"<operativa>"}`.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Aporte registrado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Aporte registrado (ledger + transfer).',
    type: SavingsGoalEntryResponseDto,
    message: 'Aporte registrado exitosamente',
  })
  deposit(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DepositSavingsGoalDto) {
    return this.service.deposit(user.userId, id, dto);
  }

  @Post(':id/withdrawals')
  @ApiOperation({
    summary: 'Retirar de una meta',
    description:
      'Registra un retiro en el ledger y mueve dinero real reserva → operativa. Resta del avance. Falla con 400 si `amount` supera el saldo del ledger. `toAccountId` es opcional (por defecto la operativa del último aporte).',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Retiro registrado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Retiro registrado (ledger + transfer).',
    type: SavingsGoalEntryResponseDto,
    message: 'Retiro registrado exitosamente',
  })
  withdraw(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: WithdrawSavingsGoalDto) {
    return this.service.withdraw(user.userId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una meta', description: 'Actualización parcial (nombre, montos, cuenta, categoría, activación).' })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Meta de ahorro actualizada exitosamente')
  @ApiGlobalResponse({
    description: 'Meta actualizada.',
    type: SavingsGoalResponseDto,
    message: 'Meta de ahorro actualizada exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSavingsGoalDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id/entries/:entryId')
  @ApiOperation({
    summary: 'Revertir un aporte/retiro',
    description: 'Borra el movimiento del ledger y su transferencia asociada (revierte el dinero). Úsalo para corregir errores.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ApiParam({ name: 'entryId', description: 'UUID del movimiento del ledger.', format: 'uuid' })
  @ResponseMessage('Movimiento revertido exitosamente')
  @ApiGlobalResponse({
    description: 'Movimiento revertido.',
    message: 'Movimiento revertido exitosamente',
  })
  removeEntry(
    @UsuarioActual() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.removeEntry(user.userId, id, entryId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una meta',
    description: 'Borrado físico de la meta y su ledger (CASCADE). Las transferencias de dinero permanecen como movimientos normales.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la meta.', format: 'uuid' })
  @ResponseMessage('Meta de ahorro eliminada exitosamente')
  @ApiGlobalResponse({
    description: 'Meta eliminada.',
    message: 'Meta de ahorro eliminada exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
