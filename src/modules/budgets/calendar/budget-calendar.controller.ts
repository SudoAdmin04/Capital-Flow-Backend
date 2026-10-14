import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../../common/decorators/usuario-actual.decorator';
import { BudgetCalendarService } from './budget-calendar.service';
import {
  CalendarEventResponseDto,
  CalendarRangeResponseDto,
  CreateCalendarEventDto,
  QueryCalendarDto,
  UpdateCalendarEventDto,
} from './dto/budget-calendar.dto';

@ApiTags('budgets-calendar')
@ApiBearerAuth()
@Controller('budgets/calendar')
export class BudgetCalendarController {
  constructor(private readonly service: BudgetCalendarService) {}

  /** Vista Day/Week/Month: `from/to` delimitan lo visible (Month suele pedir días vecinos del mes). */
  @Get()
  @ApiOperation({
    summary: 'Vista del calendario (Day/Week/Month)',
    description:
      'Devuelve los presupuestos agendados que solapan `[from, to]` con `isMultiDay/spanDays` para barras continuas (ej. Nuxt Conf 20-22), `visibleStart/visibleEnd/visibleDays` recortados al rango (barras parciales) y el mapa `days` (día → ids) para pintar cada casilla como Google Calendar. Sin `from/to` usa el mes actual. Filtra con `categoryId` y `kind`.',
  })
  @ResponseMessage('Calendario obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Eventos del rango con mapa por día.',
    type: CalendarRangeResponseDto,
    message: 'Calendario obtenido exitosamente',
  })
  findByRange(@UsuarioActual() user: AuthUser, @Query() q: QueryCalendarDto) {
    return this.service.findByRange(user.userId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un evento', description: 'Devuelve el evento con su categoría y `spanDays`.' })
  @ApiParam({ name: 'id', description: 'UUID del evento.', format: 'uuid' })
  @ResponseMessage('Evento obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Evento encontrado.',
    type: CalendarEventResponseDto,
    message: 'Evento obtenido exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Agendar un presupuesto (1 día o multidía)',
    description:
      'Agenda un presupuesto en el calendario usando `startDate/endDate` (ambas inclusive). `endDate = startDate` = 1 día (ej. Anna’s birthday); posterior = barra multidía (ej. Nuxt Conf). `title` por defecto = nombre de la categoría; `budgetId` vincula opcionalmente el techo mensual; `color` por defecto = categoría.',
  })
  @ResponseMessage('Evento creado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Evento creado.',
    type: CalendarEventResponseDto,
    message: 'Evento creado exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateCalendarEventDto) {
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mover/editar un evento',
    description: 'Actualización parcial: arrastra cambiando `startDate/endDate` (revalida `endDate ≥ startDate`), o edita título, monto, color, notas y vínculos.',
  })
  @ApiParam({ name: 'id', description: 'UUID del evento.', format: 'uuid' })
  @ResponseMessage('Evento actualizado exitosamente')
  @ApiGlobalResponse({
    description: 'Evento actualizado.',
    type: CalendarEventResponseDto,
    message: 'Evento actualizado exitosamente',
  })
  update(
    @UsuarioActual() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un evento', description: 'Borrado físico (no toca `budgets` ni `categories`).' })
  @ApiParam({ name: 'id', description: 'UUID del evento.', format: 'uuid' })
  @ResponseMessage('Evento eliminado exitosamente')
  @ApiGlobalResponse({
    description: 'Evento eliminado.',
    message: 'Evento eliminado exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
