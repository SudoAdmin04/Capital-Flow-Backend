import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { round2 } from '../../common/decimal.transformer';
import { AccountType, CategoryKind, PaymentMethod, TransactionType } from '../../common/enums';
import { AccountsService } from '../accounts/accounts.service';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { DebtsService } from '../debts/debts.service';
import { SavingsGoal } from '../savings-goals/savings-goal.entity';
import { Transaction } from '../transactions/transaction.entity';
import { DashboardGranularity, DashboardQueryDto } from './dto/dashboard-query.dto';

export interface DashboardRange {
  year: number;
  month: number;
  granularity: DashboardGranularity;
  label: string;
  from: string;
  to: string;
  monthsInRange: number;
}

export interface DashboardLine {
  categoryId: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  budget: number;
  actual: number;
  variance: number;
  executionRate: number | null;
  status: string;
  items?: DashboardLine[];
}

const LIQUID_TYPES = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CASH];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Transferencia Directa',
  [PaymentMethod.DEBIT_CARD]: 'Tarjeta Débito',
  [PaymentMethod.CREDIT_CARD]: 'Tarjeta Crédito',
  [PaymentMethod.CASH]: 'Efectivo',
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Category) private readonly catRepo: Repository<Category>,
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(SavingsGoal) private readonly goalsRepo: Repository<SavingsGoal>,
    private readonly accounts: AccountsService,
    private readonly debts: DebtsService,
  ) {}

  // ---------------------------------------------------------- rango
  resolveRange(q: DashboardQueryDto): DashboardRange {
    const now = new Date();
    const year = q.year ?? now.getUTCFullYear();
    const month = q.month ?? now.getUTCMonth() + 1;
    const granularity = q.granularity ?? DashboardGranularity.MONTHLY;

    if (granularity === DashboardGranularity.ANNUAL) {
      return {
        year, month, granularity,
        label: `${year}`,
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        monthsInRange: 12,
      };
    }
    if (granularity === DashboardGranularity.QUARTERLY) {
      const qs = Math.floor((month - 1) / 3);
      const m1 = qs * 3 + 1;
      const m2 = qs * 3 + 3;
      const last = String(new Date(Date.UTC(year, m2, 0)).getUTCDate()).padStart(2, '0');
      return {
        year, month, granularity,
        label: `Q${qs + 1} ${year}`,
        from: `${year}-${String(m1).padStart(2, '0')}-01`,
        to: `${year}-${String(m2).padStart(2, '0')}-${last}`,
        monthsInRange: 3,
      };
    }
    const mm = String(month).padStart(2, '0');
    const last = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');
    return {
      year, month, granularity,
      label: `${MESES[month - 1]} ${year}`,
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${last}`,
      monthsInRange: 1,
    };
  }

  rangeDto(r: DashboardRange) {
    return { year: r.year, month: r.month, granularity: r.granularity, label: r.label, from: r.from, to: r.to };
  }

  // ---------------------------------------------------------- base
  private status(kind: CategoryKind, budget: number, actual: number): string {
    if (kind === CategoryKind.INCOME || kind === CategoryKind.SAVINGS) return actual >= budget ? 'met' : 'below';
    if (budget === 0) return actual > 0 ? 'unbudgeted' : 'within';
    const ratio = actual / budget;
    return ratio > 1 ? 'exceeded' : ratio >= 0.9 ? 'near' : 'within';
  }

  /** Reales por categoría en el rango con filtros opcionales (las transferencias nunca cuentan). */
  private async actualsByCategory(userId: string, r: DashboardRange, q: DashboardQueryDto) {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from: r.from, to: r.to })
      .andWhere('t.type != :transfer', { transfer: TransactionType.TRANSFER })
      .andWhere('t.categoryId IS NOT NULL');
    if (q.accountId) qb.andWhere('(t.accountId = :acc OR t.destinationAccountId = :acc)', { acc: q.accountId });
    if (q.paymentMethod) qb.andWhere('t.paymentMethod = :pm', { pm: q.paymentMethod });
    qb.groupBy('t.categoryId');
    const rows = await qb.getRawMany<{ categoryId: string; total: string }>();
    return new Map(rows.map((x) => [x.categoryId, Number(x.total)]));
  }

  /** Presupuestos sumados por categoría en el rango (mensual = 1 mes, trimestral = 3, anual = 12). */
  private async budgetsByCategory(userId: string, r: DashboardRange) {
    const qb = this.budgetRepo
      .createQueryBuilder('b')
      .select('b.categoryId', 'categoryId')
      .addSelect('SUM(b.amount)', 'total')
      .where('b.userId = :userId', { userId });
    if (r.granularity === DashboardGranularity.ANNUAL) {
      qb.andWhere('b.year = :y', { y: r.year });
    } else if (r.granularity === DashboardGranularity.QUARTERLY) {
      const qs = Math.floor((r.month - 1) / 3);
      const months = [qs * 3 + 1, qs * 3 + 2, qs * 3 + 3];
      qb.andWhere('b.year = :y AND b.month IN (:...ms)', { y: r.year, ms: months });
    } else {
      qb.andWhere('b.year = :y AND b.month = :m', { y: r.year, m: r.month });
    }
    qb.groupBy('b.categoryId');
    const rows = await qb.getRawMany<{ categoryId: string; total: string }>();
    return new Map(rows.map((x) => [x.categoryId, Number(x.total)]));
  }

  /** Líneas por rubro (presupuesto + real del rubro = propio + partidas), con filtros de movimientos. */
  async buildLines(userId: string, r: DashboardRange, q: DashboardQueryDto): Promise<DashboardLine[]> {
    const [cats, actualBy, budgetBy] = await Promise.all([
      this.catRepo.find({ where: { userId }, order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.actualsByCategory(userId, r, q),
      this.budgetsByCategory(userId, r),
    ]);
    const mk = (c: Category, budget: number, actual: number, items?: DashboardLine[]): DashboardLine => ({
      categoryId: c.id,
      name: c.name,
      kind: c.kind,
      color: c.color,
      icon: c.icon,
      budget: round2(budget),
      actual: round2(actual),
      variance: round2(actual - budget),
      executionRate: budget > 0 ? round2((actual / budget) * 100) : null,
      status: this.status(c.kind, budget, actual),
      items,
    });
    return cats
      .filter((c) => !c.parentId)
      .map((root) => {
        const children = cats.filter((c) => c.parentId === root.id);
        const items = children.map((ch) => mk(ch, budgetBy.get(ch.id) ?? 0, actualBy.get(ch.id) ?? 0));
        const ownBudget = budgetBy.get(root.id) ?? 0;
        const ownActual = actualBy.get(root.id) ?? 0;
        if (ownBudget > 0 || ownActual > 0) {
          items.unshift(mk({ ...root, name: `${root.name} (sin partida)` } as Category, ownBudget, ownActual));
        }
        const budget = round2(items.reduce((s, i) => s + i.budget, 0));
        const actual = round2(items.reduce((s, i) => s + i.actual, 0));
        return mk(root, budget, actual, items);
      })
      .filter((x) => x.budget > 0 || x.actual > 0 || (x.items?.length ?? 0) > 0);
  }

  // ---------------------------------------------------------- widgets
  async kpis(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const [lines, balances] = await Promise.all([this.buildLines(userId, r, q), this.accounts.getBalances(userId)]);
    const incomeLines = lines.filter((l) => l.kind === CategoryKind.INCOME);
    const expenseLines = lines.filter((l) => l.kind !== CategoryKind.INCOME);
    const sum = (arr: DashboardLine[], f: 'budget' | 'actual') => round2(arr.reduce((s, x) => s + x[f], 0));
    const income = sum(incomeLines, 'actual');
    const incomeBudget = sum(incomeLines, 'budget');
    const expense = sum(expenseLines, 'actual');
    const expenseBudget = sum(expenseLines, 'budget');
    const net = round2(income - expense);
    const incomeRate = incomeBudget > 0 ? round2((income / incomeBudget) * 100) : null;
    const expenseRate = expenseBudget > 0 ? round2((expense / expenseBudget) * 100) : null;
    const active = q.accountId ? balances.filter((a) => a.id === q.accountId && a.isActive) : balances.filter((a) => a.isActive);
    const liquid = round2(active.filter((a) => LIQUID_TYPES.includes(a.type)).reduce((s, a) => s + a.balance, 0));
    const total = round2(active.reduce((s, a) => s + a.balance, 0));
    return {
      range: this.rangeDto(r),
      net: {
        net,
        isDeficit: net < 0,
        label: net < 0 ? 'Déficit' : 'Superávit',
        income,
        expense,
        detail: `$${income.toLocaleString('en-US')} - $${expense.toLocaleString('en-US')}`,
      },
      income: {
        total: income,
        budget: incomeBudget,
        variance: round2(income - incomeBudget),
        executionRate: incomeRate,
        badge: incomeRate == null ? 'Sin meta' : `${incomeRate}% meta`,
      },
      expense: {
        total: expense,
        budget: expenseBudget,
        variance: round2(expense - expenseBudget),
        executionRate: expenseRate,
        badge:
          expenseBudget > 0 && expenseRate != null
            ? `${expenseRate >= 100 ? '+' : ''}${round2(expenseRate - 100)}% ${expenseRate > 100 ? 'exceso' : 'ejecución'}`
            : expense > 0 ? 'Sin presupuesto' : 'Sin gasto',
      },
      liquidity: {
        range: this.rangeDto(r),
        items: active.map((a) => ({ id: a.id, name: a.name, type: a.type, isPrimary: a.isPrimary, balance: a.balance })),
        liquid,
        total,
      },
    };
  }

  async liquidity(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const balances = await this.accounts.getBalances(userId);
    const active = q.accountId ? balances.filter((a) => a.id === q.accountId && a.isActive) : balances.filter((a) => a.isActive);
    return {
      range: this.rangeDto(r),
      items: active.map((a) => ({ id: a.id, name: a.name, type: a.type, isPrimary: a.isPrimary, balance: a.balance })),
      liquid: round2(active.filter((a) => LIQUID_TYPES.includes(a.type)).reduce((s, a) => s + a.balance, 0)),
      total: round2(active.reduce((s, a) => s + a.balance, 0)),
    };
  }

  async expenseDistribution(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const lines = (await this.buildLines(userId, r, q)).filter((l) => l.kind !== CategoryKind.INCOME && l.actual > 0);
    const total = round2(lines.reduce((s, l) => s + l.actual, 0));
    return {
      range: this.rangeDto(r),
      total,
      items: lines
        .map((l) => ({
          categoryId: l.categoryId,
          name: l.name,
          kind: l.kind,
          color: l.color,
          amount: l.actual,
          percent: total > 0 ? round2((l.actual / total) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  async incomeVsBudget(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const lines = (await this.buildLines(userId, r, q)).filter((l) => l.kind === CategoryKind.INCOME);
    const items = lines.map((l) => ({
      categoryId: l.categoryId,
      name: l.name,
      budget: l.budget,
      actual: l.actual,
      variance: l.variance,
      executionRate: l.executionRate,
    }));
    const totalBudget = round2(items.reduce((s, i) => s + i.budget, 0));
    const totalActual = round2(items.reduce((s, i) => s + i.actual, 0));
    return {
      range: this.rangeDto(r),
      items,
      totalBudget,
      totalActual,
      complianceRate: totalBudget > 0 ? round2((totalActual / totalBudget) * 100) : null,
    };
  }

  async waterfall(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const lines = await this.buildLines(userId, r, q);
    const income = lines.filter((l) => l.kind === CategoryKind.INCOME && l.actual > 0);
    const expense = lines.filter((l) => l.kind !== CategoryKind.INCOME && l.actual > 0);
    let running = 0;
    const steps = [...income.map((x) => ({ x, sign: 1 })), ...expense.map((x) => ({ x, sign: -1 }))].map(({ x, sign }) => {
      const start = running;
      running = round2(running + sign * x.actual);
      return { label: x.name, type: sign > 0 ? 'increase' : 'decrease', amount: round2(sign * x.actual), start, end: running };
    });
    const total = round2(income.reduce((s, x) => s + x.actual, 0) - expense.reduce((s, x) => s + x.actual, 0));
    return {
      range: this.rangeDto(r),
      steps: [...steps, { label: 'Total', type: 'total', amount: total, start: 0, end: total }],
      total,
    };
  }

  private ledger(rows: DashboardLine[], r: DashboardRange) {
    const totalBudget = round2(rows.reduce((s, x) => s + x.budget, 0));
    const totalActual = round2(rows.reduce((s, x) => s + x.actual, 0));
    return {
      range: this.rangeDto(r),
      rows: rows.map((x) => ({
        categoryId: x.categoryId,
        name: x.name,
        kind: x.kind,
        color: x.color,
        budget: x.budget,
        actual: x.actual,
        variance: x.variance,
        executionRate: x.executionRate,
        status: x.status,
      })),
      totalBudget,
      totalActual,
      totalVariance: round2(totalActual - totalBudget),
      activeCount: rows.length,
    };
  }

  async incomeSummary(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    return this.ledger((await this.buildLines(userId, r, q)).filter((l) => l.kind === CategoryKind.INCOME), r);
  }

  async expenseSummary(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    return this.ledger((await this.buildLines(userId, r, q)).filter((l) => l.kind !== CategoryKind.INCOME), r);
  }

  async categoryBreakdown(userId: string, q: DashboardQueryDto & { categoryId?: string }) {
    const r = this.resolveRange(q);
    const lines = await this.buildLines(userId, r, q);
    const rubro =
      (q.categoryId ? lines.find((l) => l.categoryId === q.categoryId) : undefined) ??
      lines.filter((l) => l.kind !== CategoryKind.INCOME).sort((a, b) => b.actual - a.actual)[0];
    if (!rubro) {
      return {
        range: this.rangeDto(r),
        rubro: null,
        items: [],
        totalActual: 0,
        totalBudget: 0,
        footer: 'Sin movimientos en el rango',
      };
    }
    const items = (rubro.items ?? []).map((i) => ({
      categoryId: i.categoryId,
      name: i.name,
      icon: i.icon,
      actual: i.actual,
      budget: i.budget,
      variance: i.variance,
      badge:
        i.status === 'exceeded' && i.budget > 0
          ? `Ppto $${i.budget.toLocaleString('en-US')} (+${round2(((i.actual - i.budget) / i.budget) * 100)}%)`
          : i.status === 'unbudgeted'
            ? 'No presup.'
            : i.status === 'met'
              ? 'Cumplido'
              : `Ppto $${i.budget.toLocaleString('en-US')}`,
      status: i.status,
    }));
    const diff = round2(rubro.actual - rubro.budget);
    return {
      range: this.rangeDto(r),
      rubro: { id: rubro.categoryId, name: rubro.name, kind: rubro.kind },
      items,
      totalActual: rubro.actual,
      totalBudget: rubro.budget,
      footer: diff === 0 ? 'En presupuesto' : diff > 0 && rubro.kind !== CategoryKind.INCOME && rubro.kind !== CategoryKind.SAVINGS ? `Exceso (+$${diff.toLocaleString('en-US')})` : `Dentro de margen ($${diff.toLocaleString('en-US')})`,
    };
  }

  async debtsSnapshot(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const summary = await this.debts.summary(userId);
    const qb = this.txRepo
      .createQueryBuilder('t')
      .select('t.paymentMethod', 'pm')
      .addSelect('COUNT(*)', 'n')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from: r.from, to: r.to })
      .andWhere('t.debtId IS NOT NULL');
    if (q.accountId) qb.andWhere('(t.accountId = :acc OR t.destinationAccountId = :acc)', { acc: q.accountId });
    qb.groupBy('t.paymentMethod').orderBy('total', 'DESC');
    const rows = await qb.getRawMany<{ pm: PaymentMethod | null; n: string; total: string }>();
    const top = rows[0]?.pm ? METHOD_LABELS[rows[0].pm] ?? rows[0].pm : null;
    const amortized = round2(rows.reduce((s, x) => s + Number(x.total ?? 0), 0));
    return {
      range: this.rangeDto(r),
      payable: summary.payable,
      receivable: summary.receivable,
      items: summary.open.map((d: { id: string; name: string; outstanding: number; dueDate: string | null; status: string }) => ({
        id: d.id,
        name: d.name,
        outstanding: d.outstanding,
        dueDate: d.dueDate,
        status: d.status,
      })),
      topMethod: top,
      amortizedInRange: amortized,
    };
  }

  async savingsSnapshot(userId: string, q: DashboardQueryDto) {
    const r = this.resolveRange(q);
    const [goals, lines, balances] = await Promise.all([
      this.goalsRepo.find({ where: { userId, isActive: true }, order: { name: 'ASC' } }),
      this.buildLines(userId, r, q),
      this.accounts.getBalances(userId),
    ]);
    const savedByCat = new Map(lines.map((l) => [l.categoryId, l.actual]));
    const goalsOut = await Promise.all(
      goals.map(async (g) => {
        let contributed = 0;
        if (g.categoryId) {
          const row = await this.txRepo
            .createQueryBuilder('t')
            .innerJoin('t.category', 'c')
            .select('COALESCE(SUM(t.amount), 0)', 'total')
            .where('t.userId = :userId', { userId })
            .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
            .andWhere('t.date BETWEEN :from AND :to', { from: r.from, to: r.to })
            .andWhere('(t.categoryId = :cat OR c.parentId = :cat)', { cat: g.categoryId })
            .getRawOne<{ total: string }>();
          contributed = Number(row?.total ?? savedByCat.get(g.categoryId) ?? 0);
        }
        const monthlyTarget = Number(g.monthlyContribution);
        return {
          goalId: g.id,
          name: g.name,
          contributed: round2(contributed),
          monthlyTarget,
          percent: monthlyTarget > 0 ? round2((contributed / monthlyTarget) * 100) : null,
        };
      }),
    );
    const pmRows = await this.txRepo
      .createQueryBuilder('t')
      .select('t.paymentMethod', 'pm')
      .addSelect('COUNT(*)', 'n')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from: r.from, to: r.to })
      .andWhere('t.paymentMethod IS NOT NULL')
      .groupBy('t.paymentMethod')
      .getRawMany<{ pm: PaymentMethod; n: string; total: string }>();
    return {
      range: this.rangeDto(r),
      goals: goalsOut,
      totalSaved: round2(lines.filter((l) => l.kind === CategoryKind.SAVINGS).reduce((s, l) => s + l.actual, 0)),
      totalTarget: round2(goals.filter((g) => g.isActive).reduce((s, g) => s + Number(g.monthlyContribution) * r.monthsInRange, 0)),
      paymentMethods: pmRows.map((x) => ({
        method: x.pm,
        label: METHOD_LABELS[x.pm] ?? x.pm,
        total: round2(Number(x.total ?? 0)),
        count: Number(x.n ?? 0),
      })),
      linkedAccounts: balances
        .filter((a) => a.isActive)
        .map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance })),
    };
  }

  async overview(userId: string, q: DashboardQueryDto) {
    const [kpis, distribution, incomeVsBudget, waterfall, incomeSummary, expenseSummary] = await Promise.all([
      this.kpis(userId, q),
      this.expenseDistribution(userId, q),
      this.incomeVsBudget(userId, q),
      this.waterfall(userId, q),
      this.incomeSummary(userId, q),
      this.expenseSummary(userId, q),
    ]);
    return { range: kpis.range, kpis, distribution, incomeVsBudget, waterfall, incomeSummary, expenseSummary };
  }
}
