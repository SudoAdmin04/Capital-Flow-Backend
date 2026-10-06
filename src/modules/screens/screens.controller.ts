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
import { ScreensService } from './screens.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { ScreenResponseDto } from './dto/screen-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Screens')
@Controller('screens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva pantalla' })
  @ResponseMessage('Pantalla creada exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Pantalla creada exitosamente',
    type: ScreenResponseDto,
    message: 'Pantalla creada exitosamente',
  })
  create(@Body() createScreenDto: CreateScreenDto) {
    return this.screensService.create(createScreenDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las pantallas' })
  @ResponseMessage('Lista de pantallas obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de pantallas obtenida exitosamente',
    type: ScreenResponseDto,
    isArray: true,
    message: 'Lista de pantallas obtenida exitosamente',
  })
  findAll() {
    return this.screensService.findAll();
  }

  @Get('paginado')
  @ApiOperation({
    summary: 'Obtener pantallas paginadas',
    description:
      'Devuelve una página de pantallas junto con el total de registros que coinciden con la búsqueda.',
  })
  @ResponseMessage('Lista de pantallas obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Lista de pantallas paginadas obtenida exitosamente',
    type: ScreenResponseDto,
    isArray: true,
    message: 'Lista de pantallas obtenida exitosamente',
    paginated: true,
  })
  findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.screensService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una pantalla por ID' })
  @ResponseMessage('Pantalla obtenida exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Pantalla obtenida exitosamente',
    type: ScreenResponseDto,
    message: 'Pantalla obtenida exitosamente',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una pantalla' })
  @ResponseMessage('Pantalla actualizada exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Pantalla actualizada exitosamente',
    type: ScreenResponseDto,
    message: 'Pantalla actualizada exitosamente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScreenDto: UpdateScreenDto,
  ) {
    return this.screensService.update(id, updateScreenDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Activar o desactivar una pantalla' })
  @ResponseMessage('Estado de la pantalla actualizado exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Estado de la pantalla actualizado exitosamente',
    type: ScreenResponseDto,
    message: 'Estado de la pantalla actualizado exitosamente',
  })
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una pantalla' })
  @ResponseMessage('Pantalla eliminada exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Pantalla eliminada exitosamente',
    message: 'Pantalla eliminada exitosamente',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.screensService.remove(id);
  }
}
