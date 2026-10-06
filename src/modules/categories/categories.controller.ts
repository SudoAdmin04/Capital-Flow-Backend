import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto, CategoryTreeResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  /** ?tree=true devuelve rubros con partidas anidadas. */
  @Get()
  @ApiOperation({
    summary: 'Listar categorías',
    description:
      'Lista plana por defecto. Con `?tree=true` devuelve rubros con sus `children` (partidas) anidadas. Incluye el catálogo sembrado al registrarte.',
  })
  @ApiQuery({ name: 'tree', required: false, description: 'Si es `true`, agrupa partidas dentro de su rubro.', example: 'true' })
  @ResponseMessage('Categorías obtenidas exitosamente')
  @ApiGlobalResponse({
    description: 'Lista plana (`tree` ausente) o árbol de rubros con partidas (`tree=true`).',
    type: CategoryTreeResponseDto,
    isArray: true,
    message: 'Categorías obtenidas exitosamente',
  })
  findAll(@UsuarioActual() user: AuthUser, @Query('tree') tree?: string) {
    return tree === 'true' ? this.service.findTree(user.userId) : this.service.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría', description: 'Devuelve un rubro o partida por su ID.' })
  @ApiParam({ name: 'id', description: 'UUID de la categoría.', format: 'uuid' })
  @ResponseMessage('Categoría obtenida exitosamente')
  @ApiGlobalResponse({
    description: 'Categoría encontrada.',
    type: CategoryResponseDto,
    message: 'Categoría obtenida exitosamente',
  })
  findOne(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una categoría',
    description:
      'Crea un rubro (`parentId` vacío + `kind` obligatorio) o una partida (`parentId` = UUID del rubro; hereda su `kind`). Máximo 2 niveles. Nombre único por nivel.',
  })
  @ResponseMessage('Categoría creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Categoría creada.',
    type: CategoryResponseDto,
    message: 'Categoría creada exitosamente',
  })
  create(@UsuarioActual() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.service.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar una categoría',
    description: 'Actualiza nombre, color, icono, orden o activación. No se puede mover de rubro ni cambiar su `kind`.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la categoría.', format: 'uuid' })
  @ResponseMessage('Categoría actualizada exitosamente')
  @ApiGlobalResponse({
    description: 'Categoría actualizada.',
    type: CategoryResponseDto,
    message: 'Categoría actualizada exitosamente',
  })
  update(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una categoría',
    description:
      'Solo si no tiene partidas hijas ni movimientos. Si está en uso devuelve `409`: desactívala con `PATCH { isActive: false }`.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la categoría.', format: 'uuid' })
  @ResponseMessage('Categoría eliminada exitosamente')
  @ApiGlobalResponse({
    description: 'Categoría eliminada.',
    message: 'Categoría eliminada exitosamente',
  })
  remove(@UsuarioActual() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.userId, id);
  }
}
