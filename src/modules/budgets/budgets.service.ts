import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { round2 } from '../../common/decimal.transformer';
import { AdjustmentSource, CategoryKind, TransactionType } from '../../common/enums';
import { rethrowUnique } from '../../common/db-errors';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { BudgetAdjustment } from './budget-adjustment.entity';
import { Budget } from './budget.entity';
import { CopyBudgetsDto, CreateBudgetDto, QueryBudgetsDto, UpdateBudgetDto } from './dto/budget.dto';

type RubroStatus = 'within' | 'near' | 'exceeded' | 'unbudgeted' | 'met' | 'below';

interface RubroLine {
  categoryId: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  budget: number;
  actual: number;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly repo: Repository<Budget>,
    @InjectRepository(BudgetAdjustment) private readonly adjustments: Repository<BudgetAdjustment>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateBudgetDto) {
    if (!(await this.categories.count({ where: { id: dto.categoryId, userId } }))) {
      throw new NotFoundException('Categoría no encontrada');
    }
    try {
      return await this.repo.save(this.repo.create({ ...dto, userId }));
    } catch (e) {
      rethrowUnique(e, 'Ya existe un presupuesto para esa categoría y mes');
    }
  }

  findAll(userId: string, q: QueryBudgetsDto) {
    return this.repo.find({
      where: { userId, year: q.year, month: q.month },
      relations: { category: true },
      order: { category: { sortOrder: 'ASC', name: 'ASC' } },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.repo.findOne({ where: { id, userId }, relations: { category: true } });
    if (!budget) throw new NotFoundException('Presupuesto no encontrado');
    return budget;
  }

  /** Cambia el límite y deja registro en el historial de ajustes. */
  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const budget = await this.findOne(userId, id);
    if (Number(budget.amount) !== dto.amount) {
      await this.dataSource.transaction(async (m) => {
        await m.save(
          m.create(BudgetAdjustment, {
            budgetId: budget.id,
            previousAmount: budget.amount,
            newAmount: dto.amount,
            reason: dto.reason ?? null,
            source: AdjustmentSource.MANUAL,
          }),
        );
        await m.update(Budget, { id: budget.id, userId }, { amount: dto.amount });
      });
    }
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Presupuesto no encontrado');
  }

  /** Copia los presupuestos de un mes a otro (omite los que ya existen). */
  async copy(userId: string, dto: CopyBudgetsDto) {
    if (dto.fromYear === dto.toYear && dto.fromMonth === dto.toMonth) {
      throw new BadRequestException('El mes origen y destino deben ser distintos');
    }
    const source = await this.repo.find({ where: { userId, year: dto.fromYear, month: dto.fromMonth } });
    const existing = await this.repo.find({ where: { userId, year: dto.toYear, month: dto.toMonth } });
    const taken = new Set(existing.map((b) => b.categoryId));
    const toCreate = source
      .filter((b) => !taken.has(b.categoryId))
      .map((b) => this.repo.create({ userId, categoryId: b.categoryId, amount: b.amount, year: dto.toYear, month: dto.toMonth }));
    await this.repo.save(toCreate);
    return { created: toCreate.length, skipped: source.length - toCreate.length };
  }

  history(userId: string, id: string) {
    return this.adjustments.find({ where: { budgetId: id, budget: { userId } }, order: { createdAt: 'DESC' } });
  }

  recentAdjustments(userId: string, days = 14) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.adjustments
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.budget', 'b')
      .innerJoinAndSelect('b.category', 'c')
      .where('b.userId = :userId', { userId })
      .andWhere('a.createdAt >= :since', { since })
      .orderBy('a.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  // ------------------------------------------------- stats + comparativa
  private period(year: number, month: number) {
    const mm = String(month).padStart(2, '0');
    const last = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');
    return { year, month, from: `${year}-${mm}-01`, to: `${year}-${mm}-${last}` };
  }

  private rubroStatus(kind: CategoryKind, budget: number, actual: number): RubroStatus {
    if (kind === CategoryKind.INCOME || kind === CategoryKind.SAVINGS) return actual >= budget ? 'met' : 'below';
    if (budget === 0) return actual > 0 ? 'unbudgeted' : 'within';
    const ratio = actual / budget;
    return ratio > 1 ? 'exceeded' : ratio >= 0.9 ? 'near' : 'within';
  }

  /** Rubros con presupuesto del mes + real (propio + partidas). Las transferencias no cuentan. */
  private async buildRubros(userId: string, year: number, month: number): Promise<RubroLine[]> {
    const p = this.period(year, month);
    const [cats, rows, budgets] = await Promise.all([
      this.categories.find({ where: { userId }, order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.txRepo
        .createQueryBuilder('t')
        .select('t.categoryId', 'categoryId')
        .addSelect('SUM(t.amount)', 'total')
        .where('t.userId = :userId', { userId })
        .andWhere('t.date BETWEEN :from AND :to', { from: p.from, to: p.to })
        .andWhere('t.type != :transfer', { transfer: TransactionType.TRANSFER })
        .andWhere('t.categoryId IS NOT NULL')
        .groupBy('t.categoryId')
        .getRawMany<{ categoryId: string; total: string }>(),
      this.repo.find({ where: { userId, year, month } }),
    ]);
    const actualBy = new Map(rows.map((r) => [r.categoryId, Number(r.total)]));
    const budgetBy = new Map(budgets.map((b) => [b.categoryId, Number(b.amount)]));
    return cats
      .filter((c) => !c.parentId)
      .map((root) => {
        const children = cats.filter((c) => c.parentId === root.id);
        const budget =
          (budgetBy.get(root.id) ?? 0) + children.reduce((s, ch) => s + (budgetBy.get(ch.id) ?? 0), 0);
        const actual =
          (actualBy.get(root.id) ?? 0) + children.reduce((s, ch) => s + (actualBy.get(ch.id) ?? 0), 0);
        return {
          categoryId: root.id,
          name: root.name,
          kind: root.kind,
          color: root.color,
          icon: root.icon,
          budget: round2(budget),
          actual: round2(actual),
        };
      })
      .filter((r) => r.budget > 0 || r.actual > 0);
  }

  /** Cards de totales: planificado, ejecutado, restante y tasa de ejecución (sin income). */
  async stats(userId: string, q: QueryBudgetsDto) {
    const p = this.period(q.year, q.month);
    const rubros = (await this.buildRubros(userId, q.year, q.month)).filter((r) => r.kind !== CategoryKind.INCOME);
    const planificado = round2(rubros.reduce((s, r) => s + r.budget, 0));
    const ejecutado = round2(rubros.reduce((s, r) => s + r.actual, 0));
    const statuses = rubros.map((r) => this.rubroStatus(r.kind, r.budget, r.actual));
    const count = (s: RubroStatus) => statuses.filter((x) => x === s).length;
    return {
      periodo: p,
      totales: {
        planificado,
        ejecutado,
        restante: round2(planificado - ejecutado),
        tasaEjecucion: planificado > 0 ? round2((ejecutado / planificado) * 100) : null,
      },
      conteos: {
        total: rubros.length,
        enOrden: count('within') + count('met'),
        cercaLimite: count('near'),
        excedidos: count('exceeded') + count('unbudgeted'),
      },
    };
  }

  /** Componente Comparativa: Planificado vs Ejecutado por rubro + saldo neto para el footer. */
  async comparison(userId: string, q: QueryBudgetsDto) {
    const p = this.period(q.year, q.month);
    const all = await this.buildRubros(userId, q.year, q.month);
    const rubros = all.filter((r) => r.kind !== CategoryKind.INCOME);
    const incomeActual = round2(
      all.filter((r) => r.kind === CategoryKind.INCOME).reduce((s, r) => s + r.actual, 0),
    );
    const ejecutado = round2(rubros.reduce((s, r) => s + r.actual, 0));
    const planificado = round2(rubros.reduce((s, r) => s + r.budget, 0));
    const saldoNeto = round2(incomeActual - ejecutado);
    const items = rubros
      .map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        kind: r.kind,
        color: r.color,
        icon: r.icon,
        planificado: r.budget,
        ejecutado: r.actual,
        varianza: round2(r.actual - r.budget),
        tasaEjecucion: r.budget > 0 ? round2((r.actual / r.budget) * 100) : null,
        estado: this.rubroStatus(r.kind, r.budget, r.actual),
      }))
      .sort((a, b) => b.planificado - a.planificado);
    return {
      periodo: p,
      periodoId: `PER-${q.year}-${String(q.month).padStart(2, '0')}-MTRX`,
      totales: {
        planificado,
        ejecutado,
        restante: round2(planificado - ejecutado),
        tasaEjecucion: planificado > 0 ? round2((ejecutado / planificado) * 100) : null,
      },
      saldoNeto,
      esDeficit: saldoNeto < 0,
      items,
    };
  }
}
