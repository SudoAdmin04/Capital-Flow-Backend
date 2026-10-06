import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { AccountsService } from './accounts.service';
import { AccountResponseDto, CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

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
