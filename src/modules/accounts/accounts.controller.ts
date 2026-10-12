import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { AccountsService } from './accounts.service';
import {
  AccountResponseDto,
  AccountSummaryResponseDto,
  AssetsDistributionResponseDto,
  CreateAccountDto,
  ReconciliationResponseDto,
  UpdateAccountDto,
} from './dto/account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  /** Cuentas con saldo calculado (`balance = inicial + ingresos − egresos − enviadas + recibidas`). */
  @Get()
  @ApiOperation({
    summary: 'Listar mis cuentas',
    description:
      'Devuelve todas mis cuentas con `balance` calculado (`saldo inicial + ingresos − egresos − transferencias enviadas + transferencias recibidas`). Ordenadas por principal y nombre.',
  })
  @ResponseMessage('Cuentas obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de cuentas con saldo calculado.',
    type: AccountResponseDto,
    isArray: true,
    message: 'Cuentas obtenidas exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser) {
    return this.service.findAll(user.userId);
  }

  /** Cartas "Resumen general" (saldo total, conteo y principal). Va antes de `:id`. */
  @Get('summary')
  @ApiOperation({
    summary: 'Resumen general para cartas de stats',
    description:
      'Suma `balance` de cuentas activas (ej. $21,330 + "4 cuentas activas"), conteo `active/total` (ej. "4 / 4", "0 inactivas") y la cuenta principal con su saldo (ej. "Cuenta Principal" $10,950). Sin parámetros.',
  })
  @ResponseMessage('Resumen de cuentas obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Resumen para las 3 cartas de la imagen.',
    type: AccountSummaryResponseDto,
    message: 'Resumen de cuentas obtenido exitosamente',
  })
  getSummary(@UsuarioActual() user: AuthUser) {
    return this.service.getSummary(user.userId);
  }

  /** Componente "Distribución de Activos" (barra + filas por tipo). Va antes de `:id`. */
  @Get('assets-distribution')
  @ApiOperation({
    summary: 'Distribución de activos por tipo',
    description:
      'Agrupa saldos de cuentas activas: `checking` → "Cuentas Corrientes" (ej. $12,450 60%), `savings` → "Reserva / Ahorro" ($5,200 25%), `cash` → "Caja y Efectivo" ($3,180 15%). `totalActivos` = suma líquida (ej. $20,830). Ideal para la barra 0%–100% + filas con porcentaje.',
  })
  @ResponseMessage('Distribución de activos obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Distribución para el componente de activos.',
    type: AssetsDistributionResponseDto,
    message: 'Distribución de activos obtenida exitosamente',
  })
  getDistribution(@UsuarioActual() user: AuthUser) {
    return this.service.getAssetsDistribution(user.userId);
  }

  /** Componente "Conciliación Rápida" (progreso + cuadradas + pendientes). Va antes de `:id`. */
  @Get('reconciliation')
  @ApiOperation({
    summary: 'Estado de conciliación rápida',
    description:
      'Devuelve `completionRate/completionLabel` (ej. "91% Completado"), `squaredAccounts/totalAccounts/statusLabel` (ej. "10 de 11 Cuadradas"), `byAccount` (cuentas cuadradas vs pendientes) y `recentPending` (máx. 5 con `debtReference`, ej. "1 movimiento por conciliar en Préstamo #D892"). El botón "Importar Extracto (CSV/OFX)" es solo frontend.',
  })
  @ResponseMessage('Conciliación obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Estado para el componente de conciliación rápida.',
    type: ReconciliationResponseDto,
    message: 'Conciliación obtenida exitosamente',
  })
  getReconciliation(@UsuarioActual() user: AuthUser) {
    return this.service.getReconciliation(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una cuenta', description: 'Devuelve la cuenta con su `balance` calculado.' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta.', format: 'uuid' })
  @ResponseMessage('Cuenta obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Cuenta encontrada con saldo.',
    type: AccountResponseDto,
    message: 'Cuenta obtenida exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneWithBalance(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una cuenta',
    description:
      'Crea una cuenta (banco, efectivo, tarjeta). El nombre es único por usuario. Si `isPrimary=true`, se desmarca la anterior principal.',
  })
  @ResponseMessage('Cuenta creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Cuenta creada.',
    type: AccountResponseDto,
    message: 'Cuenta creada exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateAccountDto) {
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cuenta', description: 'Actualización parcial (nombre, tipo, saldos, principal, activación).' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta.', format: 'uuid' })
  @ResponseMessage('Cuenta actualizada exitosamente')
  @ApiGlobalResponse({
    description: 'Cuenta actualizada.',
    type: AccountResponseDto,
    message: 'Cuenta actualizada exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una cuenta',
    description: 'Solo si no tiene movimientos (origen ni destino). Si tiene, devuelve `409`: desactívala con `PATCH { isActive: false }`.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta.', format: 'uuid' })
  @ResponseMessage('Cuenta eliminada exitosamente')
  @ApiGlobalResponse({
    description: 'Cuenta eliminada.',
    message: 'Cuenta eliminada exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
