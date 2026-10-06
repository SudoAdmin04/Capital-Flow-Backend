import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { round2 } from '../../common/decimal.transformer';
import { AccountType, CategoryKind, TransactionStatus, TransactionType } from '../../common/enums';
import { AccountsService } from '../accounts/accounts.service';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { DebtsService } from '../debts/debts.service';
import { Transaction } from '../transactions/transaction.entity';
import { AnalyticsQueryDto, PeriodQueryDto } from './dto/reports.dto';

export interface Period {
  year: number;
  month: number;
  from: string;
  to: string;
}

export type LineStatus = 'within' | 'near' | 'exceeded' | 'unbudgeted' | 'met' | 'below';

export interface BudgetLine {
  categoryId: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  budget: number;
  actual: number;
  /** actual - budget. En egresos, positivo = sobregiro. En ingresos, negativo = faltante. */
  variance: number;
  /** actual / budget * 100 (null si no hay presupuesto). */
  executionRate: number | null;
  status: LineStatus;
  items?: BudgetLine[];
}

const LIQUID_TYPES = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CASH];

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Category) private readonly catRepo: Repository<Category>,
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
    private readonly accounts: AccountsService,
    private readonly debts: DebtsService,
  ) {}

  // ---------------------------------------------------------------- periodo
  resolvePeriod(q: PeriodQueryDto): Period {
    const now = new Date();
    return this.period(q.year ?? now.getUTCFullYear(), q.month ?? now.getUTCMonth() + 1);
  }

  private period(year: number, month: number): Period {
    const mm = String(month).padStart(2, '0');
    const last = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');
    return { year, month, from: `${year}-${mm}-01`, to: `${year}-${mm}-${last}` };
  }

  // ------------------------------------------------- presupuesto vs real
  private status(kind: CategoryKind, budget: number, actual: number): LineStatus {
    // Ingresos y ahorro son metas a alcanzar; egresos y deudas son techos a no superar.
    if (kind === CategoryKind.INCOME || kind === CategoryKind.SAVINGS) return actual >= budget ? 'met' : 'below';
    if (budget === 0) return actual > 0 ? 'unbudgeted' : 'within';
    const ratio = actual / budget;
    return ratio > 1 ? 'exceeded' : ratio >= 0.9 ? 'near' : 'within';
  }

  private line(
    c: Pick<Category, 'id' | 'name' | 'kind' | 'icon' | 'color'>,
    budget: number,
    actual: number,
    items?: BudgetLine[],
  ): BudgetLine {
    return {
      categoryId: c.id,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      budget: round2(budget),
      actual: round2(actual),
      variance: round2(actual - budget),
      executionRate: budget > 0 ? round2((actual / budget) * 100) : null,
      status: this.status(c.kind, budget, actual),
      items,
    };
  }

  /**
   * Agrupa por rubro. Presupuesto y real de un rubro = el propio + el de sus partidas.
   * Los movimientos asignados al rubro sin partida aparecen como "<rubro> (sin partida)".
   */
  async buildRubros(userId: string, p: Period): Promise<BudgetLine[]> {
    const [cats, rows, budgets] = await Promise.all([
      this.catRepo.find({ where: { userId }, order: { sortOrder: 'ASC', name: 'ASC' } }),
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
      this.budgetRepo.find({ where: { userId, year: p.year, month: p.month } }),
    ]);

    const actualBy = new Map(rows.map((r) => [r.categoryId, Number(r.total)]));
    const budgetBy = new Map(budgets.map((b) => [b.categoryId, Number(b.amount)]));

    return cats
      .filter((c) => !c.parentId)
      .map((root) => {
        const children = cats.filter((c) => c.parentId === root.id);
        const items = children.map((ch) => this.line(ch, budgetBy.get(ch.id) ?? 0, actualBy.get(ch.id) ?? 0));
        const ownBudget = budgetBy.get(root.id) ?? 0;
        const ownActual = actualBy.get(root.id) ?? 0;
        if (ownBudget > 0 || ownActual > 0) {
          items.unshift(this.line({ ...root, name: `${root.name} (sin partida)` }, ownBudget, ownActual));
        }
        const budget = items.reduce((s, i) => s + i.budget, 0);
        const actual = items.reduce((s, i) => s + i.actual, 0);
        return this.line(root, budget, actual, items);
      })
      .filter((r) => r.budget > 0 || r.actual > 0 || r.items!.length > 0);
  }

  /** Pantalla "Presupuestos y Metas". */
  async budgetOverview(userId: string, q: PeriodQueryDto) {
    const p = this.resolvePeriod(q);
    const rubros = (await this.buildRubros(userId, p)).filter((r) => r.kind !== CategoryKind.INCOME);
    const planned = round2(rubros.reduce((s, r) => s + r.budget, 0));
    const executed = round2(rubros.reduce((s, r) => s + r.actual, 0));
    const count = (s: LineStatus) => rubros.filter((r) => r.status === s).length;
    return {
      period: p,
      totals: {
        planned,
        executed,
        remaining: round2(planned - executed),
        executionRate: planned > 0 ? round2((executed / planned) * 100) : null,
      },
      counts: {
        all: rubros.length,
        within: count('within') + count('met'),
        near: count('near'),
        exceeded: count('exceeded') + count('unbudgeted'),
      },
      rubros,
    };
  }

  // -------------------------------------------------------------- dashboard
  /** Pantalla "Resumen Financiero Ejecutivo". */
  async dashboard(userId: string, q: PeriodQueryDto) {
    const p = this.resolvePeriod(q);
    const [rubros, balances, debts, pending] = await Promise.all([
      this.buildRubros(userId, p),
      this.accounts.getBalances(userId),
      this.debts.summary(userId),
      this.txRepo.count({ where: { userId, status: TransactionStatus.PENDING } }),
    ]);

    const incomeRubros = rubros.filter((r) => r.kind === CategoryKind.INCOME);
    const expenseRubros = rubros.filter((r) => r.kind !== CategoryKind.INCOME);
    const sum = (arr: BudgetLine[], f: 'budget' | 'actual') => round2(arr.reduce((s, r) => s + r[f], 0));

    const income = sum(incomeRubros, 'actual');
    const expense = sum(expenseRubros, 'actual');
    const incomeBudget = sum(incomeRubros, 'budget');
    const expenseBudget = sum(expenseRubros, 'budget');
    const net = round2(income - expense);

    // Distribución de gastos (donut)
    const distribution = expenseRubros
      .filter((r) => r.actual > 0)
      .map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        kind: r.kind,
        color: r.color,
        amount: r.actual,
        percent: expense > 0 ? round2((r.actual / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Waterfall corregido: ingresos suben, egresos bajan, y el cierre es el saldo neto real.
    let running = 0;
    const steps = [...incomeRubros.map((r) => ({ r, sign: 1 })), ...expenseRubros.map((r) => ({ r, sign: -1 }))]
      .filter(({ r }) => r.actual > 0)
      .map(({ r, sign }) => {
        const start = running;
        running = round2(running + sign * r.actual);
        return {
          label: r.name,
          type: sign > 0 ? ('increase' as const) : ('decrease' as const),
          amount: round2(sign * r.actual),
          start,
          end: running,
        };
      });
    const waterfall = { steps: [...steps, { label: 'Saldo neto', type: 'total' as const, amount: net, start: 0, end: net }] };

    // Disponibilidad y patrimonio
    const active = balances.filter((a) => a.isActive);
    const liquid = round2(active.filter((a) => LIQUID_TYPES.includes(a.type)).reduce((s, a) => s + a.balance, 0));
    const accountsTotal = round2(active.reduce((s, a) => s + a.balance, 0));

    return {
      period: p,
      totals: {
        income,
        incomeBudget,
        incomeVariance: round2(income - incomeBudget),
        incomeExecutionRate: incomeBudget > 0 ? round2((income / incomeBudget) * 100) : null,
        expense,
        expenseBudget,
        expenseVariance: round2(expense - expenseBudget),
        expenseExecutionRate: expenseBudget > 0 ? round2((expense / expenseBudget) * 100) : null,
        net,
        isDeficit: net < 0,
        saved: sum(expenseRubros.filter((r) => r.kind === CategoryKind.SAVINGS), 'actual'),
        debtPayments: sum(expenseRubros.filter((r) => r.kind === CategoryKind.DEBT), 'actual'),
      },
      accounts: {
        items: active.map((a) => ({ id: a.id, name: a.name, type: a.type, isPrimary: a.isPrimary, balance: a.balance })),
        liquid,
        total: accountsTotal,
      },
      liabilities: { payable: debts.payable, receivable: debts.receivable },
      netWorth: round2(accountsTotal + debts.receivable - debts.payable),
      pendingTransactions: pending,
      distribution,
      incomeRubros,
      expenseRubros,
      waterfall,
    };
  }

  // -------------------------------------------------------------- analíticas
  /** Pantalla "Analíticas y Proyecciones". */
  async analytics(userId: string, q: AnalyticsQueryDto) {
    const end = this.resolvePeriod(q);
    const months = q.months ?? 6;
    const periods: Period[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(end.year, end.month - 1 - i, 1));
      periods.push(this.period(d.getUTCFullYear(), d.getUTCMonth() + 1));
    }
    const startKey = periods[0].year * 100 + periods[0].month;
    const endKey = end.year * 100 + end.month;

    const rows = await this.txRepo
      .createQueryBuilder('t')
      .leftJoin('t.category', 'c')
      .select("to_char(t.date, 'YYYY-MM')", 'ym')
      .addSelect('t.type', 'type')
      .addSelect('c.kind', 'kind')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.date BETWEEN :from AND :to', { from: periods[0].from, to: end.to })
      .andWhere('t.type != :transfer', { transfer: TransactionType.TRANSFER })
      .groupBy("to_char(t.date, 'YYYY-MM')")
      .addGroupBy('t.type')
      .addGroupBy('c.kind')
      .getRawMany<{ ym: string; type: TransactionType; kind: CategoryKind | null; total: string }>();

    const budgetRows = await this.budgetRepo
      .createQueryBuilder('b')
      .innerJoin('b.category', 'c')
      .select('b.year', 'year')
      .addSelect('b.month', 'month')
      .addSelect('SUM(b.amount)', 'total')
      .where('b.userId = :userId', { userId })
      .andWhere('c.kind != :income', { income: CategoryKind.INCOME })
      .andWhere('(b.year * 100 + b.month) BETWEEN :s AND :e', { s: startKey, e: endKey })
      .groupBy('b.year')
      .addGroupBy('b.month')
      .getRawMany<{ year: number; month: number; total: string }>();

    const cashflow = periods.map((p) => {
      const ym = `${p.year}-${String(p.month).padStart(2, '0')}`;
      const mine = rows.filter((r) => r.ym === ym);
      const income = mine.filter((r) => r.type === TransactionType.INCOME).reduce((s, r) => s + Number(r.total), 0);
      const expense = mine.filter((r) => r.type === TransactionType.EXPENSE).reduce((s, r) => s + Number(r.total), 0);
      const saved = mine.filter((r) => r.kind === CategoryKind.SAVINGS && r.type === TransactionType.EXPENSE).reduce((s, r) => s + Number(r.total), 0);
      const budgetExpense = Number(budgetRows.find((b) => Number(b.year) === p.year && Number(b.month) === p.month)?.total ?? 0);
      return {
        period: ym,
        income: round2(income),
        expense: round2(expense),
        net: round2(income - expense),
        saved: round2(saved),
        budgetExpense: round2(budgetExpense),
      };
    });

    const current = cashflow[cashflow.length - 1];
    const previous = cashflow.length > 1 ? cashflow[cashflow.length - 2] : null;

    // Runway = liquidez / gasto mensual promedio (últimos 3 meses con gasto).
    const lastExpenses = cashflow.filter((c) => c.expense > 0).slice(-3).map((c) => c.expense);
    const avgExpense = lastExpenses.length ? lastExpenses.reduce((s, v) => s + v, 0) / lastExpenses.length : 0;
    const balances = await this.accounts.getBalances(userId);
    const liquid = round2(
      balances.filter((a) => a.isActive && LIQUID_TYPES.includes(a.type)).reduce((s, a) => s + a.balance, 0),
    );

    const target = q.savingsTargetPercent ?? 15;
    const savingsRate = current.income > 0 ? round2((current.saved / current.income) * 100) : null;
    const targetAmount = round2((current.income * target) / 100);

    // Fuga de capital y alertas a partir del presupuesto vs real del mes.
    const rubros = (await this.buildRubros(userId, end)).filter((r) => r.kind !== CategoryKind.INCOME);
    const totalExpense = rubros.reduce((s, r) => s + r.actual, 0);
    const leakage = rubros
      .filter((r) => r.actual > 0)
      .map((r) => ({
        categoryId: r.categoryId,
        name: r.name,
        actual: r.actual,
        budget: r.budget,
        variance: r.variance,
        percentOfExpense: totalExpense > 0 ? round2((r.actual / totalExpense) * 100) : 0,
        status: r.status,
      }))
      .sort((a, b) => b.actual - a.actual);

    const alerts = rubros
      // Se alerta al nivel más específico: partidas si el rubro las tiene, o el rubro mismo.
      .flatMap((r) => (r.items?.length ? r.items : [r]))
      .filter((l) => (l.status === 'exceeded' || l.status === 'unbudgeted') && l.actual > 0)
      .map((l) => {
        const ratio = l.budget > 0 ? l.actual / l.budget : Infinity;
        return {
          categoryId: l.categoryId,
          title: l.status === 'unbudgeted' ? `Gasto sin presupuesto: ${l.name}` : `Sobregiro en ${l.name}`,
          severity: ratio > 1.25 ? ('high' as const) : ('moderate' as const),
          actual: l.actual,
          budget: l.budget,
          overspend: l.variance,
        };
      })
      .sort((a, b) => b.overspend - a.overspend);

    return {
      period: end,
      cashflow,
      kpis: {
        savingsRate,
        savingsTargetPercent: target,
        savingsGap: round2(Math.max(targetAmount - current.saved, 0)),
        liquid,
        averageMonthlyExpense: round2(avgExpense),
        runwayMonths: avgExpense > 0 ? round2(liquid / avgExpense) : null,
        expenseDeviation: round2(current.expense - current.budgetExpense),
        expenseMoM: previous && previous.expense > 0 ? round2(((current.expense - previous.expense) / previous.expense) * 100) : null,
        averageIncome: round2(cashflow.reduce((s, c) => s + c.income, 0) / cashflow.length),
      },
      leakage,
      alerts,
    };
  }
}
