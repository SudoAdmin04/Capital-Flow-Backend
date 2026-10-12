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

/** Cuenta principal resumida para la carta "Cuenta principal". */
export class PrimaryAccountDto {
  @ApiProperty({ description: 'UUID de la cuenta principal.', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Nombre (ej. "Cuenta Principal").', example: 'Cuenta Principal' })
  name: string;

  @ApiProperty({ description: 'Tipo de cuenta.', enum: AccountType, example: AccountType.CHECKING })
  type: AccountType;

  @ApiProperty({ description: 'Saldo calculado de la principal.', example: 10950 })
  balance: number;
}

/** `GET /accounts/summary` — Cartas "Resumen general". */
export class AccountSummaryResponseDto {
  @ApiProperty({ description: 'Carta "Saldo total (activas)" (ej. $21,330). Suma de `balance` de cuentas activas.', example: 21330 })
  totalBalance: number;

  @ApiProperty({ description: 'Cuentas activas (ej. 4).', example: 4 })
  activeCount: number;

  @ApiProperty({ description: 'Cuentas inactivas (ej. 0).', example: 0 })
  inactiveCount: number;

  @ApiProperty({ description: 'Total de cuentas (ej. 4).', example: 4 })
  totalCount: number;

  @ApiProperty({ description: 'Etiqueta "4 / 4" para la carta de conteo.', example: '4 / 4' })
  label: string;

  @ApiProperty({ description: 'Carta "Cuenta principal" (null si ninguna marcada).', type: PrimaryAccountDto, nullable: true })
  primary: PrimaryAccountDto | null;
}

/** Grupo de la distribución de activos (barra + fila). */
export class AssetGroupDto {
  @ApiProperty({ description: 'Clave del grupo (`checking | savings | cash | credit_card`).', example: 'checking' })
  key: string;

  @ApiProperty({ description: 'Etiqueta lista para UI (ej. "Cuentas Corrientes").', example: 'Cuentas Corrientes' })
  label: string;

  @ApiProperty({ description: 'Saldo sumado del grupo (solo activas).', example: 12450 })
  balance: number;

  @ApiProperty({ description: 'Porcentaje sobre el total de activos (`balance / totalActivos * 100`).', example: 60 })
  percent: number;

  @ApiProperty({ description: 'Número de cuentas activas en el grupo.', example: 2 })
  count: number;
}

/** `GET /accounts/assets-distribution` — Componente "Distribución de Activos". */
export class AssetsDistributionResponseDto {
  @ApiProperty({ description: 'Total de activos (ej. $20,830). Suma de `checking + savings + cash` activas.', example: 20830 })
  totalActivos: number;

  @ApiProperty({ description: 'Etiqueta lista para UI (ej. "Total Activos: $20,830.00").', example: 'Total Activos: $20,830.00' })
  label: string;

  @ApiProperty({ description: 'Grupos para la barra segmentada y las filas (ej. Corrientes 60%, Ahorro 25%, Efectivo 15%).', type: [AssetGroupDto] })
  items: AssetGroupDto[];
}

/** Desglose por cuenta para la conciliación rápida. */
export class ReconciliationAccountDto {
  @ApiProperty({ description: 'UUID de la cuenta.', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  accountId: string;

  @ApiProperty({ description: 'Nombre de la cuenta.', example: 'Nómina BBVA' })
  accountName: string;

  @ApiProperty({ description: 'Movimientos totales de la cuenta.', example: 6 })
  total: number;

  @ApiProperty({ description: 'Movimientos conciliados.', example: 6 })
  reconciled: number;

  @ApiProperty({ description: 'Movimientos por conciliar.', example: 0 })
  pending: number;

  @ApiProperty({ description: 'Monto por conciliar en la cuenta.', example: 0 })
  pendingAmount: number;

  @ApiProperty({ description: '`true` si `pending === 0` (cuenta "cuadrada").', example: true })
  isSquared: boolean;
}

/** Movimiento pendiente reciente (para el aviso "1 movimiento por conciliar en Préstamo #D892"). */
export class PendingItemDto {
  @ApiProperty({ description: 'UUID del movimiento.', example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  id: string;

  @ApiProperty({ description: 'Concepto del movimiento.', example: 'Abono préstamo' })
  concept: string;

  @ApiProperty({ description: 'Monto por conciliar.', example: 3000 })
  amount: number;

  @ApiProperty({ description: 'Fecha contable YYYY-MM-DD.', example: '2025-10-05' })
  date: string;

  @ApiProperty({ description: 'Cuenta origen.', example: 'Nómina BBVA' })
  accountName: string;

  @ApiProperty({ description: 'Referencia de la deuda vinculada (ej. "#D892", null si no aplica).', example: '#D892', nullable: true })
  debtReference: string | null;
}

/** `GET /accounts/reconciliation` — Componente "Conciliación Rápida". */
export class ReconciliationResponseDto {
  @ApiProperty({ description: 'Movimientos totales del usuario.', example: 11 })
  total: number;

  @ApiProperty({ description: 'Movimientos conciliados.', example: 10 })
  reconciledCount: number;

  @ApiProperty({ description: 'Movimientos por conciliar.', example: 1 })
  pendingCount: number;

  @ApiProperty({ description: 'Monto total por conciliar.', example: 3000 })
  pendingAmount: number;

  @ApiProperty({ description: 'Avance `reconciled / total * 100` (ej. 91% Completado).', example: 91 })
  completionRate: number;

  @ApiProperty({ description: 'Etiqueta "91% Completado".', example: '91% Completado' })
  completionLabel: string;

  @ApiProperty({ description: 'Cuentas cuadradas (`pending === 0`).', example: 10 })
  squaredAccounts: number;

  @ApiProperty({ description: 'Cuentas activas evaluadas.', example: 11 })
  totalAccounts: number;

  @ApiProperty({ description: 'Etiqueta "10 de 11 Cuadradas".', example: '10 de 11 Cuadradas' })
  statusLabel: string;

  @ApiProperty({ description: 'Desglose por cuenta.', type: [ReconciliationAccountDto] })
  byAccount: ReconciliationAccountDto[];

  @ApiProperty({ description: 'Pendientes recientes (máx. 5, ej. "1 movimiento por conciliar en Préstamo #D892").', type: [PendingItemDto] })
  recentPending: PendingItemDto[];
}
