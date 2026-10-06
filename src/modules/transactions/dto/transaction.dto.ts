import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination.dto';
import { PaymentMethod, TransactionStatus, TransactionType } from '../../../common/enums';

export class CreateTransactionDto {
  @ApiProperty({
    description:
      'Tipo de movimiento. `income` exige categoría `income`; `expense` exige categoría no-`income`; `transfer` exige cuenta destino y prohíbe categoría.',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Cuenta origen (UUID de una cuenta propia). En transferencias es la cuenta que envía.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsUUID()
  accountId: string;

  @ApiPropertyOptional({
    description: 'Solo transferencias: cuenta destino (distinta a la origen).',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    format: 'uuid',
  })
  /** Solo transferencias. */
  @IsOptional()
  @IsUUID()
  destinationAccountId?: string;

  @ApiPropertyOptional({
    description: 'Obligatoria en ingreso/egreso, prohibida en transferencias. Si pasas un rubro con partidas, el reporte lo agrega.',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    format: 'uuid',
  })
  /** Obligatoria en ingreso/egreso. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Vincula el movimiento a una deuda (abono o cargo). Afecta `paidAmount`/`outstanding` de la deuda.',
    example: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  debtId?: string;

  @ApiProperty({
    description: 'Monto siempre positivo (> 0) con hasta 2 decimales. El signo lo determina `type`.',
    example: 850.75,
    minimum: 0.01,
    maximum: 999999999,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999_999_999)
  amount: number;

  @ApiProperty({
    description: 'Fecha contable del movimiento (sin hora). Usada para filtros y reportes mensuales.',
    example: '2025-10-05',
    format: 'date',
  })
  /** YYYY-MM-DD */
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Concepto corto visible en listados (ej. "Súper semanal").',
    example: 'Súper semanal',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  concept: string;

  @ApiPropertyOptional({
    description: 'Detalle largo opcional.',
    example: 'Compra en supermercado incluyendo despensa y limpieza',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Medio de pago.',
    enum: PaymentMethod,
    example: PaymentMethod.DEBIT_CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Estado: `pending` (por conciliar) o `reconciled`. Por defecto `pending`.',
    enum: TransactionStatus,
    example: TransactionStatus.PENDING,
    default: TransactionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Referencia externa (folio, autorización).',
    example: 'TICKET-12345',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reference?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class QueryTransactionsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Fecha inicial inclusiva (YYYY-MM-DD).', example: '2025-10-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha final inclusiva (YYYY-MM-DD).', example: '2025-10-31', format: 'date' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de movimiento.', enum: TransactionType, example: TransactionType.EXPENSE })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Filtrar por estado de conciliación.', enum: TransactionStatus, example: TransactionStatus.PENDING })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por medio de pago.', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Rubro o partida. Si es un rubro, incluye sus partidas.',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    format: 'uuid',
  })
  /** Rubro o partida. Si es un rubro, incluye sus partidas. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Cuenta origen o destino.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  /** Cuenta origen o destino. */
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por texto en concepto, descripción o referencia.',
    example: 'súper',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Orden por fecha contable.',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class ReconcileBatchDto {
  @ApiProperty({
    description: 'IDs de movimientos en estado `pending` a marcar como `reconciled`. Máximo 200 por lote.',
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
    type: [String],
    maxItems: 200,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids: string[];
}

/** Movimiento tal como lo devuelve la API, con relaciones cargadas. */
export class TransactionResponseDto {
  @ApiProperty({ description: 'UUID del movimiento.', example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  id: string;

  @ApiProperty({ description: 'Tipo de movimiento.', enum: TransactionType, example: TransactionType.EXPENSE })
  type: TransactionType;

  @ApiProperty({ description: 'UUID de la cuenta origen.', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  accountId: string;

  @ApiProperty({ description: 'Cuenta origen (resumen).', nullable: true })
  account: { id: string; name: string; type: string } | null;

  @ApiProperty({ description: 'UUID de la cuenta destino (solo transferencias).', example: null, nullable: true })
  destinationAccountId: string | null;

  @ApiProperty({ description: 'Cuenta destino (solo transferencias).', nullable: true })
  destinationAccount: { id: string; name: string; type: string } | null;

  @ApiProperty({ description: 'UUID de la categoría (null en transferencias).', example: 'c3d4e5f6-a7b8-9012-cdef-123456789012', nullable: true })
  categoryId: string | null;

  @ApiProperty({ description: 'Categoría (null en transferencias).', nullable: true })
  category: { id: string; name: string; kind: string } | null;

  @ApiProperty({ description: 'UUID de la deuda vinculada (null si no aplica).', example: null, nullable: true })
  debtId: string | null;

  @ApiProperty({ description: 'Monto siempre positivo; el signo lo da `type`.', example: 850.75 })
  amount: number;

  @ApiProperty({ description: 'Fecha contable YYYY-MM-DD.', example: '2025-10-05' })
  date: string;

  @ApiProperty({ description: 'Concepto corto.', example: 'Súper semanal' })
  concept: string;

  @ApiProperty({ description: 'Detalle largo.', example: null, nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Medio de pago.', enum: PaymentMethod, example: PaymentMethod.DEBIT_CARD, nullable: true })
  paymentMethod: PaymentMethod | null;

  @ApiProperty({ description: 'Estado de conciliación.', enum: TransactionStatus, example: TransactionStatus.PENDING })
  status: TransactionStatus;

  @ApiProperty({ description: 'Fecha de conciliación (null si pendiente).', example: null, nullable: true })
  reconciledAt: Date | null;

  @ApiProperty({ description: 'Referencia externa.', example: 'TICKET-12345', nullable: true })
  reference: string | null;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-05T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}

/** Página de movimientos (`GET /transactions`). */
export class PaginatedTransactionsResponseDto {
  @ApiProperty({ description: 'Movimientos de la página.', type: [TransactionResponseDto] })
  items: TransactionResponseDto[];

  @ApiProperty({ description: 'Total de movimientos que cumplen el filtro.', example: 42 })
  total: number;

  @ApiProperty({ description: 'Página actual.', example: 1 })
  page: number;

  @ApiProperty({ description: 'Elementos por página.', example: 25 })
  limit: number;

  @ApiProperty({ description: 'Total de páginas.', example: 2 })
  pages: number;
}

/** Resultado de `POST /transactions/reconcile`. */
export class ReconcileResponseDto {
  @ApiProperty({ description: 'Movimientos que pasaron de `pending` a `reconciled`.', example: 3 })
  updated: number;
}
