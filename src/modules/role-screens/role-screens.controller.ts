import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RoleScreensService } from './role-screens.service';
import { CreateRoleScreenDto } from './dto/create-role-screen.dto';
import { UpdateRoleScreenDto } from './dto/update-role-screen.dto';
import { RoleScreenResponseDto } from './dto/role-screen-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Role Screens')
@Controller('role-screens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoleScreensController {
  constructor(private readonly roleScreensService: RoleScreensService) {}

  @Post()
  @ApiOperation({ summary: 'Asignar permisos de pantalla a un rol' })
  @ResponseMessage('Permisos de pantalla asignados exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Permisos asignados exitosamente',
    type: RoleScreenResponseDto,
    message: 'Permisos de pantalla asignados exitosamente',
  })
  create(@Body() createRoleScreenDto: CreateRoleScreenDto) {
    return this.roleScreensService.create(createRoleScreenDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los permisos de pantallas por rol' })
  @ResponseMessage('Lista de permisos obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de permisos obtenida exitosamente',
    type: RoleScreenResponseDto,
    isArray: true,
    message: 'Lista de permisos obtenida exitosamente',
  })
  findAll() {
    return this.roleScreensService.findAll();
  }

  @Get('paginado')
  @ApiOperation({
    summary: 'Obtener permisos paginados',
    description:
      'Devuelve una página de permisos de rol a pantallas junto con el total de registros que coinciden con la búsqueda.',
  })
  @ResponseMessage('Lista de permisos obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de permisos paginados obtenida exitosamente',
    type: RoleScreenResponseDto,
    isArray: true,
    message: 'Lista de permisos obtenida exitosamente',
    paginated: true,
  })
  findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.roleScreensService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un permiso de pantalla por ID' })
  @ResponseMessage('Permiso obtenido exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Permiso obtenido exitosamente',
    type: RoleScreenResponseDto,
    message: 'Permiso obtenido exitosamente',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleScreensService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar permisos de pantalla de un rol' })
  @ResponseMessage('Permisos actualizados exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Permisos actualizados exitosamente',
    type: RoleScreenResponseDto,
    message: 'Permisos actualizados exitosamente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleScreenDto: UpdateRoleScreenDto,
  ) {
    return this.roleScreensService.update(id, updateRoleScreenDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar permisos de pantalla de un rol' })
  @ResponseMessage('Permisos eliminados exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Permisos eliminados exitosamente',
    message: 'Permisos eliminados exitosamente',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleScreensService.remove(id);
  }
}
