import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CreateSavingsGoalDto, GoalProgressQueryDto, GoalProgressResponseDto, SavingsGoalResponseDto, UpdateSavingsGoalDto } from './dto/savings-goal.dto';
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
      'Para cada meta activa calcula: `contributed` (egresos del mes en su categoría), `monthlyTarget`, `percent`, `remaining`, `totalContributed` (histórico) y `targetProgressPercent` (vs `targetAmount`). Requiere `year` y `month`.',
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
      'Crea una meta con aporte mensual y opcionalmente cuenta y categoría (los egresos de esa categoría cuentan como aportes). `accountId` y `categoryId` deben ser propios.',
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

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una meta', description: 'Borrado físico (no borra los movimientos asociados).' })
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
