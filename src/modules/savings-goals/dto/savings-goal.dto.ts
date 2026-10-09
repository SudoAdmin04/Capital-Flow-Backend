import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SavingsGoalEntryKind } from '../../../common/enums';

export class CreateSavingsGoalDto {
  @ApiProperty({
    description: 'Nombre de la meta (ej. "Reserva de emergencia", "Viaje").',
    example: 'Reserva de emergencia',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description: 'Aporte mensual esperado. Se compara contra los egresos del mes en su categoría.',
    example: 2000,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyContribution: number;

  @ApiPropertyOptional({
    description: 'Monto total objetivo (opcional). Permite calcular el % de avance histórico.',
    example: 30000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetAmount?: number;

  @ApiPropertyOptional({
    description: 'Cuenta donde vive el ahorro (p. ej. Reserva). Debe ser propia.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  /** Cuenta donde vive el ahorro (p. ej. Reserva). */
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Rubro/partida cuyos egresos cuentan como aportes. Si es rubro, incluye sus partidas.',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    format: 'uuid',
  })
  /** Rubro/partida cuyos egresos cuentan como aportes. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class UpdateSavingsGoalDto extends PartialType(CreateSavingsGoalDto) {
  @ApiPropertyOptional({ description: 'Desactiva la meta sin borrarla.', example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GoalProgressQueryDto {
  @ApiProperty({ description: 'Año del periodo a evaluar.', example: 2025, minimum: 2000, maximum: 2100 })
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year: number;
  @ApiProperty({ description: 'Mes del periodo a evaluar (1-12).', example: 10, minimum: 1, maximum: 12 })
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
}

/** Meta tal como la devuelve la API. */
export class SavingsGoalResponseDto {
  @ApiProperty({ description: 'UUID de la meta.', example: 'b8c9d0e1-f2a3-4567-bcde-678901234567' })
  id: string;

  @ApiProperty({ description: 'Nombre de la meta.', example: 'Reserva de emergencia' })
  name: string;

  @ApiProperty({ description: 'Aporte mensual esperado.', example: 2000 })
  monthlyContribution: number;

  @ApiProperty({ description: 'Monto total objetivo (null si no aplica).', example: 30000, nullable: true })
  targetAmount: number | null;

  @ApiProperty({ description: 'UUID de la cuenta (null si no aplica).', example: null, nullable: true })
  accountId: string | null;

  @ApiProperty({ description: 'UUID de la categoría (null si no aplica).', example: 'c3d4e5f6-a7b8-9012-cdef-123456789012', nullable: true })
  categoryId: string | null;

  @ApiProperty({ description: 'Activa o desactivada.', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/** Avance mensual de una meta (`GET /savings-goals/progress`). */
export class GoalProgressResponseDto {
  @ApiProperty({ description: 'Meta evaluada.', type: SavingsGoalResponseDto })
  goal: SavingsGoalResponseDto;

  @ApiProperty({ description: 'Periodo evaluado.', example: { year: 2025, month: 10 } })
  period: { year: number; month: number };

  @ApiProperty({ description: 'Aporte neto del mes (depósitos − retiros del ledger; fallback: egresos de su categoría).', example: 1500 })
  contributed: number;

  @ApiProperty({ description: 'Meta mensual.', example: 2000 })
  monthlyTarget: number;

  @ApiProperty({ description: '% del mes (`contributed / monthlyTarget * 100`, null si meta es 0).', example: 75, nullable: true })
  percent: number | null;

  @ApiProperty({ description: 'Faltante del mes (`max(target − contributed, 0)`).', example: 500 })
  remaining: number;

  @ApiProperty({ description: 'Aportes históricos netos acumulados.', example: 8500 })
  totalContributed: number;

  @ApiProperty({ description: '% vs `targetAmount` (null si no hay objetivo total).', example: 28.33, nullable: true })
  targetProgressPercent: number | null;

  @ApiPropertyOptional({ description: 'Depósitos brutos del mes (solo modo ledger).', example: 1500 })
  depositsMonth?: number;

  @ApiPropertyOptional({ description: 'Retiros brutos del mes (solo modo ledger).', example: 0 })
  withdrawalsMonth?: number;

  @ApiPropertyOptional({ description: 'Origen del cálculo: `ledger` o `category` (fallback sin movimientos).', example: 'ledger' })
  source?: 'ledger' | 'category';
}

/** Aporte a una meta: mueve dinero real operativa → reserva y registra el ledger. */
export class DepositSavingsGoalDto {
  @ApiProperty({ description: 'Monto a aportar (> 0, 2 decimales).', example: 1500, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Fecha contable del aporte (YYYY-MM-DD).', example: '2025-10-05', format: 'date' })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Cuenta origen (operativa). Si la meta tiene cuenta reserva distinta, se crea un `transfer` real hacia ella.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsUUID()
  fromAccountId: string;

  @ApiPropertyOptional({ description: 'Concepto del aporte.', example: 'Aporte quincenal', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  concept?: string;
}

/** Retiro de una meta: mueve dinero real reserva → operativa y resta del avance. */
export class WithdrawSavingsGoalDto {
  @ApiProperty({ description: 'Monto a retirar (> 0, debe ser ≤ saldo del ledger).', example: 500, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Fecha contable del retiro (YYYY-MM-DD).', example: '2025-10-10', format: 'date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Cuenta destino (operativa). Por defecto se usa la misma cuenta origen del último aporte o la primera propia.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  toAccountId?: string;

  @ApiPropertyOptional({ description: 'Concepto del retiro.', example: 'Emergencia médica', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  concept?: string;
}

export class QueryGoalEntriesDto {
  @ApiPropertyOptional({ description: 'Fecha inicial inclusiva (YYYY-MM-DD).', example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha final inclusiva (YYYY-MM-DD).', example: '2025-10-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Movimiento del ledger tal como lo devuelve la API. */
export class SavingsGoalEntryResponseDto {
  @ApiProperty({ description: 'UUID del movimiento.', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'UUID de la meta.', format: 'uuid' })
  goalId: string;

  @ApiProperty({ description: 'Tipo: aporte o retiro.', enum: SavingsGoalEntryKind, example: SavingsGoalEntryKind.DEPOSIT })
  kind: SavingsGoalEntryKind;

  @ApiProperty({ description: 'Monto siempre positivo.', example: 1500 })
  amount: number;

  @ApiProperty({ description: 'Fecha contable YYYY-MM-DD.', example: '2025-10-05' })
  date: string;

  @ApiProperty({ description: 'Cuenta operada (null en modo virtual).', nullable: true })
  accountId: string | null;

  @ApiProperty({ description: 'Transfer que movió el dinero (null en modo virtual).', nullable: true })
  transactionId: string | null;

  @ApiProperty({ description: 'Concepto.', nullable: true })
  concept: string | null;

  @ApiProperty({ description: 'Creación.' })
  createdAt: Date;
}

/** Saldo de una meta (`GET /savings-goals/:id/balance`). */
export class SavingsGoalBalanceResponseDto {
  @ApiProperty({ description: 'Meta evaluada.', type: SavingsGoalResponseDto })
  goal: SavingsGoalResponseDto;

  @ApiProperty({ description: 'Saldo neto del ledger (depósitos − retiros).', example: 1000 })
  balance: number;

  @ApiProperty({ description: 'Total histórico de depósitos.', example: 1500 })
  totalDeposited: number;

  @ApiProperty({ description: 'Total histórico de retiros.', example: 500 })
  totalWithdrawn: number;

  @ApiProperty({ description: 'Número de movimientos en el ledger.', example: 2 })
  entriesCount: number;
}
