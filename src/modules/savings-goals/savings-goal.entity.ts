import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';

/** Meta de ahorro (p. ej. $500 semanales). El avance se mide con las transacciones de `category`. */
@Entity('savings_goals')
export class SavingsGoal extends OwnedEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  monthlyContribution: number;

  /** Monto objetivo total (opcional, p. ej. fondo de emergencia). */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  targetAmount: number | null;

  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: Account | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
