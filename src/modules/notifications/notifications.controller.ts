import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva notificación' })
  @ResponseMessage('Notificación creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Notificación creada exitosamente',
    type: NotificationResponseDto,
    message: 'Notificación creada exitosamente',
  })
  create(
    @UsuarioActual() user: AuthUser,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(user.userId, createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las notificaciones del usuario' })
  @ResponseMessage('Lista de notificaciones obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de notificaciones obtenida exitosamente',
    type: NotificationResponseDto,
    isArray: true,
    message: 'Lista de notificaciones obtenida exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser) {
    return this.notificationsService.findAll(user.userId);
  }

  @Get('paginado')
  @ApiOperation({
    summary: 'Obtener notificaciones del usuario paginadas',
    description:
      'Devuelve una página de notificaciones junto con el total de registros que coinciden con la búsqueda.',
  })
  @ResponseMessage('Lista de notificaciones obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de notificaciones paginadas obtenida exitosamente',
    type: NotificationResponseDto,
    isArray: true,
    message: 'Lista de notificaciones obtenida exitosamente',
    paginated: true,
  })
  findAllPaginated(
    @UsuarioActual() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.findAllPaginated(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una notificación por ID' })
  @ResponseMessage('Notificación obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Notificación obtenida exitosamente',
    type: NotificationResponseDto,
    message: 'Notificación obtenida exitosamente',
  })
  findOne(
    @UsuarioActual() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una notificación' })
  @ResponseMessage('Notificación actualizada exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Notificación actualizada exitosamente',
    type: NotificationResponseDto,
    message: 'Notificación actualizada exitosamente',
  })
  update(
    @UsuarioActual() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(user.userId, id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una notificación' })
  @ResponseMessage('Notificación eliminada exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Notificación eliminada exitosamente',
    message: 'Notificación eliminada exitosamente',
  })
  remove(
    @UsuarioActual() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.remove(user.userId, id);
  }
}
