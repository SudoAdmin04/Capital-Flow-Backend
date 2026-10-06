import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UserResponseDto } from './dto/user-response.dto';
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

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (admin)' })
  @ResponseMessage('Usuarios obtenidos exitosamente')
  @ApiGlobalResponse({
    description: 'Lista de usuarios.',
    isArray: true,
    message: 'Usuarios obtenidos exitosamente',
  })
  findAll() {
    return this.usersService.findAll();
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
    type: UserResponseDto,
    message: 'Rol asignado exitosamente',
  })
  asignarRol(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarRolDto) {
    return this.usersService.setRole(id, dto.roleId ?? null);
  }
}
