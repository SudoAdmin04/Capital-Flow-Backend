import { Controller, Get } from '@nestjs/common';
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
      'Carga idempotente del ambiente de prueba: roles, pantallas (con módulo y jerarquía), usuarios, permisos role-pantalla y datos financieros de ejemplo del superAdmin (cuentas, categorías, deudas, transacciones, presupuestos, metas y notificaciones). Re-ejecutable, no borra datos.',
  })
  @ApiResponse({ status: 200, description: 'Seed ejecutado correctamente.' })
  executeSeed() {
    return this.seedService.executeSeed();
  }
}
