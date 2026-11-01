import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SeedService } from './seed.service';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Ejecutar seed de datos iniciales',
    description:
      'Carga idempotente del ambiente de prueba: roles, pantallas (con módulo y jerarquía), usuarios, permisos role-pantalla y datos financieros de ejemplo del superAdmin (cuentas, categorías, deudas, transacciones, presupuestos, metas y notificaciones). Re-ejecutable, no borra datos. En producción exige el header x-seed-token con el valor de SEED_TOKEN.',
  })
  @ApiResponse({ status: 200, description: 'Seed ejecutado correctamente.' })
  executeSeed(@Headers('x-seed-token') token?: string) {
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN)
    ) {
      throw new UnauthorizedException('Seed deshabilitado en producción');
    }
    return this.seedService.executeSeed();
  }
}
