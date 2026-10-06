import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { PaymentMethod, TransactionStatus, TransactionType } from '../../common/enums';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Debt } from '../debts/debt.entity';

@Entity('transactions')
@Index(['userId', 'date'])
@Index(['userId', 'categoryId'])
@Index(['accountId'])
@Check('"amount" > 0')
export class Transaction extends OwnedEntity {
  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, (a) => a.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  /** Solo transferencias: cuenta que recibe. */
  @Column({ type: 'uuid', nullable: true })
  destinationAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destinationAccountId' })
  destinationAccount: Account | null;

  /** Obligatoria en ingreso/egreso, nula en transferencias. */
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  /** Si el movimiento es un abono/cargo de un pasivo. */
  @Column({ type: 'uuid', nullable: true })
  debtId: string | null;

  @ManyToOne(() => Debt, (d) => d.transactions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'debtId' })
  debt: Debt | null;

  @Column({ type: 'enum', enum: TransactionType, enumName: 'transaction_type' })
  type: TransactionType;

  /** Siempre positivo; el signo lo da `type`. */
  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  amount: number;

  /** Fecha contable (YYYY-MM-DD), sin zona horaria. */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 160 })
  concept: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method', nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    enumName: 'transaction_status',
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reconciledAt: Date | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  reference: string | null;
}
