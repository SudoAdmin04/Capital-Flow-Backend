import { Body, Controller, Get } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGlobalResponse } from '../../common/decorators/api-response.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UsuarioActual, AuthUser } from '../../common/decorators/usuario-actual.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegistroDto } from './dto/registro.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('registro')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario y obtener JWT',
    description:
      'Flujo inicial: crea el usuario (con rol base no-admin), le siembra el catálogo de categorías (rubros/partidas del Excel) y emite access + refresh token. El token incluye `roleId`, `role`, `isAdmin` y `permisos` (pantallas del rol). Después crea sus cuentas y registra ingresos/egresos con transactions.',
  })
  @ResponseMessage('Usuario registrado exitosamente')
  @ApiGlobalResponse({
    status: 201,
    description: 'Usuario registrado exitosamente y token JWT emitido',
    type: AuthResponseDto,
    message: 'Usuario registrado exitosamente',
  })
  registro(@Body() registroDto: RegistroDto) {
    return this.authService.registro(registroDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión y obtener JWT',
    description:
      'El token incluye `roleId`, `role`, `isAdmin` y `permisos` (pantallas que el usuario puede ver según su rol, con canRead/canCreate/canUpdate/canDelete).',
  })
  @ResponseMessage('Sesión iniciada exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Sesión iniciada exitosamente y token JWT emitido',
    type: AuthResponseDto,
    message: 'Sesión iniciada exitosamente',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access_token usando refresh_token' })
  @ResponseMessage('Token renovado exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Token JWT renovado exitosamente',
    type: AuthResponseDto,
    message: 'Token renovado exitosamente',
  })
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ResponseMessage('Perfil obtenido exitosamente')
  @ApiGlobalResponse({
    status: 200,
    description: 'Perfil de usuario obtenido exitosamente',
    type: UserResponseDto,
    message: 'Perfil obtenido exitosamente',
  })
  getProfile(@UsuarioActual() user: AuthUser) {
    const { passwordHash, ...rest } = user as any;
    return rest;
  }
}
