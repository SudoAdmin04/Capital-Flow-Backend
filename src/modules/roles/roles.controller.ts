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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ResponseMessage('Rol creado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Rol creado exitosamente',
    type: RoleResponseDto,
    message: 'Rol creado exitosamente',
  })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ResponseMessage('Lista de roles obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
    type: RoleResponseDto,
    isArray: true,
    message: 'Lista de roles obtenida exitosamente',
  })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('paginado')
  @ApiOperation({
    summary: 'Obtener roles paginados',
    description:
      'Devuelve una página de roles junto con el total de registros que coinciden con la búsqueda.',
  })
  @ResponseMessage('Lista de roles obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de roles paginados obtenida exitosamente',
    type: RoleResponseDto,
    isArray: true,
    message: 'Lista de roles obtenida exitosamente',
    paginated: true,
  })
  findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.rolesService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ResponseMessage('Rol obtenido exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Rol obtenido exitosamente',
    type: RoleResponseDto,
    message: 'Rol obtenido exitosamente',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ResponseMessage('Rol actualizado exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Rol actualizado exitosamente',
    type: RoleResponseDto,
    message: 'Rol actualizado exitosamente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ResponseMessage('Rol eliminado exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Rol eliminado exitosamente',
    message: 'Rol eliminado exitosamente',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
}
