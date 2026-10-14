import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OwnedEntity } from '../../../common/owned.entity';
import { decimalTransformer } from '../../../common/decimal.transformer';
import { Category } from '../../categories/category.entity';
import { Budget } from '../budget.entity';

/**
 * Evento del calendario de presupuestos (`budget_calendar_events`).
 * Reutiliza la estructura de presupuestos: cada evento cuelga de una
 * `Category` (rubro/partida, de ahí sale color/icono/kind) y puede
 * vincularse opcionalmente a un `Budget` mensual (trazabilidad con el
 * techo del mes). A diferencia de `budgets` (único por categoría+mes),
 * aquí sí se permiten varios eventos multidía por categoría y mes.
 */
@Entity('budget_calendar_events')
@Check('"endDate" >= "startDate"')
@Check('"amount" >= 0')
@Index(['userId', 'startDate'])
@Index(['userId', 'endDate'])
export class BudgetCalendarEvent extends OwnedEntity {
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  /** Presupuesto mensual vinculado (opcional, no obligatorio). */
  @Column({ type: 'uuid', nullable: true })
  budgetId: string | null;

  @ManyToOne(() => Budget, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'budgetId' })
  budget: Budget | null;

  /** Título visible en la casilla del calendario. Por defecto el nombre de la categoría. */
  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer })
  amount: number;

  /** Fecha inicio (inclusive, YYYY-MM-DD). */
  @Column({ type: 'date' })
  startDate: string;

  /** Fecha fin (inclusive, YYYY-MM-DD). Igual a inicio = 1 día; distinto = multidía (barra tipo Nuxt Conf). */
  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Override de color hex (`#3b82f6`). Si es null se usa el de la categoría. */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'boolean', default: true })
  isAllDay: boolean;
}
