import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { BudgetsService } from './budgets.service';
import {
  BudgetAdjustmentResponseDto,
  BudgetResponseDto,
  CopyBudgetsDto,
  CopyBudgetsResponseDto,
  CreateBudgetDto,
  QueryBudgetsDto,
  RecentAdjustmentsDto,
  UpdateBudgetDto,
} from './dto/budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  /** Presupuestos de un mes. Para el análisis presupuesto vs real usa /reports/budget-overview. */
  @Get()
  @ApiOperation({
    summary: 'Listar presupuestos del mes',
    description:
      'Devuelve los límites del `year/month` indicados con su categoría. Para el comparativo con gasto real usa `GET /reports/budget-overview`. Requiere `year` y `month`.',
  })
  @ResponseMessage('Presupuestos obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de presupuestos del mes con su categoría.',
    type: BudgetResponseDto,
    isArray: true,
    message: 'Presupuestos obtenidos exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser, @Query() q: QueryBudgetsDto) {
    return this.service.findAll(user.userId, q);
  }

  @Get('adjustments/recent')
  @ApiOperation({
    summary: 'Ajustes recientes',
    description: 'Historial de cambios de límites de los últimos N días (por defecto 14, máximo 365, tope 50 registros).',
  })
  @ResponseMessage('Ajustes recientes obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Ajustes con su presupuesto y categoría.',
    type: BudgetAdjustmentResponseDto,
    isArray: true,
    message: 'Ajustes recientes obtenidos exitosamente',
  })
  recent(@UsuarioActual() user: AuthUser, @Query() q: RecentAdjustmentsDto) {
    return this.service.recentAdjustments(user.userId, q.days);
  }

  @Post('copy')
  @ApiOperation({
    summary: 'Copiar presupuestos entre meses',
    description:
      'Copia todos los límites del mes origen al destino. Omite categorías que ya tengan presupuesto en el destino. Responde `{ created, skipped }`. Origen y destino deben diferir.',
  })
  @ResponseMessage('Presupuestos copiados exitosamente')
  @ApiGlobalResponse({
    description: 'Copia completada.',
    type: CopyBudgetsResponseDto,
    message: 'Presupuestos copiados exitosamente',
  })
  copy(@UsuarioActual() user: AuthUser, @Body() dto: CopyBudgetsDto) {
    return this.service.copy(user.userId, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear un presupuesto',
    description: 'Crea el límite de una categoría para un mes. La combinación categoría+año+mes es única.',
  })
  @ResponseMessage('Presupuesto creado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Presupuesto creado.',
    type: BudgetResponseDto,
    message: 'Presupuesto creado exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateBudgetDto) {
    return this.service.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un presupuesto', description: 'Devuelve el presupuesto con su categoría.' })
  @ApiParam({ name: 'id', description: 'UUID del presupuesto.', format: 'uuid' })
  @ResponseMessage('Presupuesto obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Presupuesto encontrado.',
    type: BudgetResponseDto,
    message: 'Presupuesto obtenido exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Get(':id/adjustments')
  @ApiOperation({
    summary: 'Historial de un presupuesto',
    description: 'Lista los cambios de límite (`previousAmount → newAmount`, motivo, origen) ordenados por fecha descendente.',
  })
  @ApiParam({ name: 'id', description: 'UUID del presupuesto.', format: 'uuid' })
  @ResponseMessage('Historial del presupuesto obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Historial de ajustes del presupuesto.',
    type: BudgetAdjustmentResponseDto,
    isArray: true,
    message: 'Historial del presupuesto obtenido exitosamente',
  })
  history(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Ajustar un presupuesto',
    description: 'Cambia el límite y registra el ajuste en el historial (con `reason` opcional). Si el monto no cambia, no genera registro.',
  })
  @ApiParam({ name: 'id', description: 'UUID del presupuesto.', format: 'uuid' })
  @ResponseMessage('Presupuesto ajustado exitosamente')
  @ApiGlobalResponse({
    description: 'Presupuesto actualizado.',
    type: BudgetResponseDto,
    message: 'Presupuesto ajustado exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBudgetDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un presupuesto', description: 'Borrado físico del límite (no borra su historial).' })
  @ApiParam({ name: 'id', description: 'UUID del presupuesto.', format: 'uuid' })
  @ResponseMessage('Presupuesto eliminado exitosamente')
  @ApiGlobalResponse({
    description: 'Presupuesto eliminado.',
    message: 'Presupuesto eliminado exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
