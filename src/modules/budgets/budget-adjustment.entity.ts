import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/base.entity';
import { AdjustmentSource } from '../../common/enums';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Budget } from './budget.entity';

/** Historial de cambios de limite ("Historial de Ajustes"). */
@Entity('budget_adjustments')
export class BudgetAdjustment extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  budgetId: string;

  @ManyToOne(() => Budget, (b) => b.adjustments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budgetId' })
  budget: Budget;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  previousAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  newAmount: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: AdjustmentSource, enumName: 'adjustment_source', default: AdjustmentSource.MANUAL })
  source: AdjustmentSource;
}
