import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaymentMethod } from '../../../common/enums';

export enum DashboardGranularity {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

/**
 * Filtros del Dashboard ejecutivo.
 * - Sin `year/month` usa el mes actual (UTC).
 * - `granularity` expande el rango: mensual (1 mes), trimestral (Q completo) o anual (año completo).
 * - `accountId` limita los movimientos a esa cuenta (origen o destino).
 * - `paymentMethod` equivale al filtro "Todos los métodos" del header.
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Año del periodo. Por defecto el actual (UTC).', example: 2025, minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ description: 'Mes del periodo (1-12). Por defecto el actual (UTC).', example: 10, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Granularidad: `monthly` (defecto), `quarterly` (trimestre del mes) o `annual` (año completo). Equivale a los botones Mensual/Trimestral/Anual.',
    enum: DashboardGranularity,
    example: DashboardGranularity.MONTHLY,
    default: DashboardGranularity.MONTHLY,
  })
  @IsOptional()
  @IsEnum(DashboardGranularity)
  granularity?: DashboardGranularity;

  @ApiPropertyOptional({
    description: 'Filtra movimientos por cuenta (origen o destino). Equivale al dropdown "Cuenta Principal". Sin filtro usa todas.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filtra movimientos por medio de pago. Equivale al filtro "Todos los métodos". Sin filtro usa todos.',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class CategoryBreakdownQueryDto extends DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'UUID del rubro a desglosar por partidas (ej. Servicios). Si se omite, usa el primer rubro de egresos con movimiento.',
    example: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
