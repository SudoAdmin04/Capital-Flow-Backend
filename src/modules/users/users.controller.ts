import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserCatalogResponseDto } from './dto/user-catalog-response.dto';
import { UsersService } from './users.service';

class AsignarRolDto {
  @ApiPropertyOptional({ example: 1, description: 'ID del rol. null para retirarlo.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number | null;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario (admin)' })
  @ResponseMessage('Usuario creado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Usuario creado exitosamente.',
    type: UserCatalogResponseDto,
    message: 'Usuario creado exitosamente',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createAdmin(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (admin)' })
  @ResponseMessage('Usuarios obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de usuarios.',
    type: UserCatalogResponseDto,
    isArray: true,
    message: 'Usuarios obtenidos exitosamente',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('paginado')
  @ApiOperation({
    summary: 'Obtener usuarios paginados (admin)',
    description:
      'Devuelve una página de usuarios junto con el total de registros que coinciden con la búsqueda (nombre o correo).',
  })
  @ResponseMessage('Usuarios obtenidos exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de usuarios paginados obtenida exitosamente.',
    type: UserCatalogResponseDto,
    isArray: true,
    message: 'Usuarios obtenidos exitosamente',
    paginated: true,
  })
  findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.usersService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID (admin)' })
  @ResponseMessage('Usuario obtenido exitosamente')
  @ApiGlobalResponse({
    description: 'Usuario obtenido.',
    type: UserCatalogResponseDto,
    message: 'Usuario obtenido exitosamente',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un usuario (admin)' })
  @ResponseMessage('Usuario actualizado exitosamente')
  @ApiGlobalResponse({
    description: 'Usuario con datos actualizados.',
    type: UserCatalogResponseDto,
    message: 'Usuario actualizado exitosamente',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Activar o desactivar un usuario (admin)' })
  @ResponseMessage('Estado del usuario actualizado exitosamente')
  @ApiGlobalResponse({
    description: 'Usuario con estado actualizado.',
    type: UserCatalogResponseDto,
    message: 'Estado del usuario actualizado exitosamente',
  })
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleActive(id);
  }

  @Patch(':id/rol')
  @ApiOperation({
    summary: 'Asignar rol a un usuario (admin)',
    description:
      'Asigna el rol cuyas pantallas viajarán dentro del JWT del usuario. El cambio aplica en su próximo login/refresh (y en cada request vía JwtStrategy).',
  })
  @ResponseMessage('Rol asignado exitosamente')
  @ApiGlobalResponse({
    description: 'Usuario con rol actualizado.',
    type: UserCatalogResponseDto,
    message: 'Rol asignado exitosamente',
  })
  asignarRol(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarRolDto) {
    return this.usersService.setRole(id, dto.roleId ?? null);
  }
}
