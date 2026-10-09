import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { SavingsGoalEntryKind } from '../../common/enums';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Account } from '../accounts/account.entity';
import { Transaction } from '../transactions/transaction.entity';
import { SavingsGoal } from './savings-goal.entity';

/**
 * Ledger auditable de una meta de ahorro.
 * Cada aporte (deposit) / retiro (withdrawal) mueve dinero real entre cuentas
 * vía un `Transaction` de tipo `transfer` y deja una entrada aquí para calcular el avance.
 */
@Entity('savings_goal_entries')
@Index(['userId', 'goalId', 'date'])
@Index(['userId', 'goalId'])
@Check('"amount" > 0')
export class SavingsGoalEntry extends OwnedEntity {
  @Column({ type: 'uuid' })
  goalId: string;

  @ManyToOne(() => SavingsGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: SavingsGoal;

  @Column({ type: 'enum', enum: SavingsGoalEntryKind, enumName: 'savings_goal_entry_kind' })
  kind: SavingsGoalEntryKind;

  /** Siempre positivo; el signo lo da `kind`. */
  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  amount: number;

  /** Fecha contable (YYYY-MM-DD), sin zona horaria. */
  @Column({ type: 'date' })
  date: string;

  /** Cuenta operada (origen del aporte o destino del retiro). */
  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: Account | null;

  /** Transferencia que movió el dinero real (null en modo virtual sin cuenta reserva). */
  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  concept: string | null;
}
