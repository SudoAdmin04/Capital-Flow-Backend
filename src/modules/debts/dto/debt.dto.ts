import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { DebtDirection, DebtStatus } from '../../../common/enums';

export class CreateDebtDto {
  @ApiProperty({
    description: 'Nombre del pasivo (ej. "Préstamo auto", "Préstamo a Juan").',
    example: 'Préstamo auto',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'Contraparte (banco, persona).',
    example: 'Banco XYZ',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterparty?: string;

  @ApiPropertyOptional({
    description: 'Referencia externa (contrato, folio).',
    example: 'CRED-001',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reference?: string;

  @ApiPropertyOptional({
    description: '`payable` = yo debo (resta patrimonio); `receivable` = me deben (suma patrimonio).',
    enum: DebtDirection,
    example: DebtDirection.PAYABLE,
    default: DebtDirection.PAYABLE,
  })
  @IsOptional()
  @IsEnum(DebtDirection)
  direction?: DebtDirection;

  @ApiProperty({
    description: 'Monto original del principal (> 0). El saldo vivo = principal − movimientos vinculados.',
    example: 50000,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  principalAmount: number;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento (YYYY-MM-DD).',
    example: '2026-03-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Notas internas.',
    example: 'Mensualidad los días 15',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateDebtDto extends PartialType(CreateDebtDto) {
  @ApiPropertyOptional({
    description: '`open` = vigente; `paid` = liquidada. También puedes usar `POST /debts/:id/settle`.',
    enum: DebtStatus,
    example: DebtStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;
}

/** Deuda tal como la devuelve la API, con saldos calculados. */
export class DebtResponseDto {
  @ApiProperty({ description: 'UUID de la deuda.', example: 'c9d0e1f2-a3b4-5678-cdef-789012345678' })
  id: string;

  @ApiProperty({ description: 'Nombre del pasivo.', example: 'Préstamo auto' })
  name: string;

  @ApiProperty({ description: 'Contraparte.', example: 'Banco XYZ', nullable: true })
  counterparty: string | null;

  @ApiProperty({ description: 'Referencia externa.', example: 'CRED-001', nullable: true })
  reference: string | null;

  @ApiProperty({ description: 'Dirección: `payable` (yo debo) o `receivable` (me deben).', enum: DebtDirection, example: DebtDirection.PAYABLE })
  direction: DebtDirection;

  @ApiProperty({ description: 'Monto original del principal.', example: 50000 })
  principalAmount: number;

  @ApiProperty({ description: 'Estado: `open` o `paid`.', enum: DebtStatus, example: DebtStatus.OPEN })
  status: DebtStatus;

  @ApiProperty({ description: 'Fecha de vencimiento YYYY-MM-DD.', example: '2026-03-15', nullable: true })
  dueDate: string | null;

  @ApiProperty({ description: 'Notas internas.', example: 'Mensualidad los días 15', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Suma de movimientos vinculados (`SUM(tx.debtId)`).', example: 12000 })
  paidAmount: number;

  @ApiProperty({ description: 'Saldo vivo = `max(principal − pagado, 0)`.', example: 38000 })
  outstanding: number;

  @ApiProperty({ description: 'Fecha de creación.', example: '2025-10-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización.', example: '2025-10-05T12:00:00.000Z' })
  updatedAt: Date;
}
