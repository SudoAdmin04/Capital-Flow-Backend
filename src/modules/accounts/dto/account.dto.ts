import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { AccountType } from '../../../common/enums';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Nombre único por usuario (ej. "Nómina BBVA", "Efectivo", "Reserva").',
    example: 'Nómina BBVA',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    description: 'Tipo de cuenta. `credit_card` admite saldo negativo (deuda).',
    enum: AccountType,
    example: AccountType.CHECKING,
  })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({
    description: 'Banco o institución (opcional).',
    example: 'BBVA',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @ApiPropertyOptional({
    description: 'Últimos 4 dígitos (solo tarjetas/cuentas, exactamente 4 dígitos).',
    example: '1234',
    pattern: '^\\d{4}$',
  })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'last4 deben ser exactamente 4 dígitos' })
  last4?: string;

  @ApiPropertyOptional({
    description: 'Código ISO de moneda.',
    example: 'MXN',
    default: 'MXN',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Saldo inicial antes del primer movimiento. El `balance` se calcula sumando movimientos.',
    example: 15000.5,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  initialBalance?: number;

  @ApiPropertyOptional({
    description: 'Límite de crédito (relevante para tarjetas).',
    example: 30000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Si es `true`, se desmarca cualquier otra cuenta principal.',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @ApiPropertyOptional({
    description: 'Desactiva la cuenta sin borrarla (recomendado si ya tiene movimientos).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Cuenta tal como la devuelve la API, con `balance` calculado. */
export class AccountResponseDto {
  @ApiProperty({ description: 'UUID de la cuenta.', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Nombre único por usuario.', example: 'Nómina BBVA' })
  name: string;

  @ApiProperty({ description: 'Tipo de cuenta.', enum: AccountType, example: AccountType.CHECKING })
  type: AccountType;

  @ApiProperty({ description: 'Banco o institución (null si no aplica).', example: 'BBVA', nullable: true })
  institution: string | null;

  @ApiProperty({ description: 'Últimos 4 dígitos (null si no aplica).', example: '1234', nullable: true })
  last4: string | null;

  @ApiProperty({ description: 'Moneda ISO.', example: 'MXN' })
  currency: string;

  @ApiProperty({ description: 'Saldo inicial capturado al crear la cuenta.', example: 15000.5 })
  initialBalance: number;

  @ApiProperty({ description: 'Límite de crédito (null si no aplica).', example: 30000, nullable: true })
  creditLimit: number | null;

  @ApiProperty({ description: 'Cuenta principal (preseleccionada en el header).', example: true })
  isPrimary: boolean;

  @ApiProperty({ description: 'Si está desactivada no aparece en reportes de liquidez.', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Saldo calculado = `initialBalance + ingresos − egresos − transferencias enviadas + transferencias recibidas`.',
    example: 18450.75,
  })
  balance: number;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}
