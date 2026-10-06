import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Category } from '../categories/category.entity';
import { BudgetAdjustment } from './budget-adjustment.entity';

/** Presupuesto mensual por rubro o partida. */
@Entity('budgets')
@Unique(['userId', 'categoryId', 'year', 'month'])
@Check('"month" BETWEEN 1 AND 12')
@Check('"amount" >= 0')
export class Budget extends OwnedEntity {
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ type: 'smallint' })
  month: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  amount: number;

  @OneToMany(() => BudgetAdjustment, (a) => a.budget)
  adjustments: BudgetAdjustment[];
}
