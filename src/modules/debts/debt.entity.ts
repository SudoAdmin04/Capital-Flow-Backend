import { Column, Entity, OneToMany } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { DebtDirection, DebtStatus } from '../../common/enums';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Transaction } from '../transactions/transaction.entity';

/**
 * Pasivo (o cuenta por cobrar). Los abonos son transacciones con debtId.
 * Saldo pendiente = principalAmount - SUM(transacciones vinculadas).
 */
@Entity('debts')
export class Debt extends OwnedEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  counterparty: string | null;

  /** Referencia externa, ej. "#D892". */
  @Column({ type: 'varchar', length: 60, nullable: true })
  reference: string | null;

  @Column({ type: 'enum', enum: DebtDirection, enumName: 'debt_direction', default: DebtDirection.PAYABLE })
  direction: DebtDirection;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  principalAmount: number;

  @Column({ type: 'enum', enum: DebtStatus, enumName: 'debt_status', default: DebtStatus.OPEN })
  status: DebtStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Transaction, (t) => t.debt)
  transactions: Transaction[];
}
