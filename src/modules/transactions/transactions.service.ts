import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { CategoryKind, DebtDirection, DebtStatus, TransactionStatus, TransactionType } from '../../common/enums';
import { round2 } from '../../common/decimal.transformer';
import { Account } from '../accounts/account.entity';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { Debt } from '../debts/debt.entity';
import {
  CreateTransactionDto,
  QueryTransactionSummaryDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { Transaction } from './transaction.entity';

interface State {
  type: TransactionType;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  debtId: string | null;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Debt) private readonly debts: Repository<Debt>,
    @InjectRepository(Budget) private readonly budgets: Repository<Budget>,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const state: State = {
      type: dto.type,
      accountId: dto.accountId,
      destinationAccountId: dto.destinationAccountId ?? null,
      categoryId: dto.categoryId ?? null,
      debtId: dto.debtId ?? null,
    };
    await this.validate(userId, state);
    const reconciled = dto.status === TransactionStatus.RECONCILED;
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        ...state,
        userId,
        status: dto.status ?? TransactionStatus.PENDING,
        reconciledAt: reconciled ? new Date() : null,
      }),
    );
    return this.findOne(userId, saved.id);
  }

  async findAll(userId: string, q: QueryTransactionsDto) {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.destinationAccount', 'destination')
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.debt', 'debt')
      .where('t.userId = :userId', { userId });

    if (q.from) qb.andWhere('t.date >= :from', { from: q.from });
    if (q.to) qb.andWhere('t.date <= :to', { to: q.to });
    if (q.type) qb.andWhere('t.type = :type', { type: q.type });
    if (q.status) qb.andWhere('t.status = :status', { status: q.status });
    if (q.paymentMethod) qb.andWhere('t.paymentMethod = :pm', { pm: q.paymentMethod });
    if (q.accountId) {
      qb.andWhere('(t.accountId = :acc OR t.destinationAccountId = :acc)', { acc: q.accountId });
    }
    if (q.categoryId) {
      qb.andWhere('(t.categoryId = :cat OR category.parentId = :cat)', { cat: q.categoryId });
    }
    if (q.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('t.concept ILIKE :s')
            .orWhere('t.description ILIKE :s')
            .orWhere('t.reference ILIKE :s'),
        ),
        { s: `%${q.search.replace(/[%_\\]/g, '\\$&')}%` },
      );
    }

    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    qb.orderBy('t.date', q.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Resumen para las cartas de stats (imagen: ingresos, egresos, saldo neto, por conciliar/deuda).
   * Aplica los mismos filtros de alcance que el listado (`from/to/accountId/categoryId/paymentMethod/search`)
   * y desglosa por `type` y `status`. Las transferencias no suman a ingresos/egresos/neto.
   * Si `from/to` caen en un único mes, compara contra `budgets` de ese mes.
   */
  async getSummary(userId: string, q: QueryTransactionSummaryDto) {
    const scoped = (alias = 't') => {
      const qb = this.repo
        .createQueryBuilder(alias)
        .leftJoin(`${alias}.category`, 'category')
        .where(`${alias}.userId = :userId`, { userId });
      if (q.from) qb.andWhere(`${alias}.date >= :from`, { from: q.from });
      if (q.to) qb.andWhere(`${alias}.date <= :to`, { to: q.to });
      if (q.paymentMethod) qb.andWhere(`${alias}.paymentMethod = :pm`, { pm: q.paymentMethod });
      if (q.accountId) {
        qb.andWhere(`(${alias}.accountId = :acc OR ${alias}.destinationAccountId = :acc)`, { acc: q.accountId });
      }
      if (q.categoryId) {
        qb.andWhere(`(${alias}.categoryId = :cat OR category.parentId = :cat)`, { cat: q.categoryId });
      }
      if (q.search) {
        qb.andWhere(
          new Brackets((b) =>
            b
              .where(`${alias}.concept ILIKE :s`)
              .orWhere(`${alias}.description ILIKE :s`)
              .orWhere(`${alias}.reference ILIKE :s`),
          ),
          { s: `%${q.search.replace(/[%_\\]/g, '\\$&')}%` },
        );
      }
      return qb;
    };

    const raw = await scoped()
      .select(`SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END)`, 'incomeTotal')
      .addSelect(`COUNT(CASE WHEN t.type = :income THEN 1 END)`, 'incomeCount')
      .addSelect(`SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END)`, 'expenseTotal')
      .addSelect(`COUNT(CASE WHEN t.type = :expense THEN 1 END)`, 'expenseCount')
      .addSelect(`SUM(CASE WHEN t.type = :transfer THEN t.amount ELSE 0 END)`, 'transferTotal')
      .addSelect(`COUNT(CASE WHEN t.type = :transfer THEN 1 END)`, 'transferCount')
      .addSelect(`SUM(CASE WHEN t.status = :pending THEN t.amount ELSE 0 END)`, 'pendingTotal')
      .addSelect(`COUNT(CASE WHEN t.status = :pending THEN 1 END)`, 'pendingCount')
      .addSelect(`SUM(CASE WHEN t.status = :reconciled THEN t.amount ELSE 0 END)`, 'reconciledTotal')
      .addSelect(`COUNT(CASE WHEN t.status = :reconciled THEN 1 END)`, 'reconciledCount')
      .addSelect('COUNT(t.id)', 'totalCount')
      .setParameters({
        income: TransactionType.INCOME,
        expense: TransactionType.EXPENSE,
        transfer: TransactionType.TRANSFER,
        pending: TransactionStatus.PENDING,
        reconciled: TransactionStatus.RECONCILED,
      })
      .getRawOne<{
        incomeTotal: string | null;
        incomeCount: string | null;
        expenseTotal: string | null;
        expenseCount: string | null;
        transferTotal: string | null;
        transferCount: string | null;
        pendingTotal: string | null;
        pendingCount: string | null;
        reconciledTotal: string | null;
        reconciledCount: string | null;
        totalCount: string | null;
      }>();

    const num = (v: string | null | undefined) => Number(v ?? 0) || 0;
    const int = (v: string | null | undefined) => parseInt(v ?? '0', 10) || 0;
    const incomeTotal = round2(num(raw?.incomeTotal));
    const expenseTotal = round2(num(raw?.expenseTotal));
    const incomeCount = int(raw?.incomeCount);
    const expenseCount = int(raw?.expenseCount);
    const netTotal = round2(incomeTotal - expenseTotal);

    // ---- presupuestos del mes (solo si el rango es un mes único) ----
    let incomeBudget = 0;
    let expenseBudget = 0;
    const month = this.singleMonth(q.from, q.to);
    if (month) {
      const rows = await this.budgets
        .createQueryBuilder('b')
        .innerJoin('b.category', 'c')
        .select('c.kind', 'kind')
        .addSelect('SUM(b.amount)', 'total')
        .where('b.userId = :userId', { userId })
        .andWhere('b.year = :year AND b.month = :month', { year: month.year, month: month.month })
        .groupBy('c.kind')
        .getRawMany<{ kind: CategoryKind; total: string }>();
      for (const r of rows) {
        if (r.kind === CategoryKind.INCOME) incomeBudget += Number(r.total);
        else expenseBudget += Number(r.total);
      }
      incomeBudget = round2(incomeBudget);
      expenseBudget = round2(expenseBudget);
    }

    // ---- deudas abiertas (saldo pendiente real = principal - abonos) ----
    const [openDebts, paidRows] = await Promise.all([
      this.debts.find({ where: { userId, status: DebtStatus.OPEN } }),
      this.repo
        .createQueryBuilder('t')
        .select('t.debtId', 'id')
        .addSelect('SUM(t.amount)', 'total')
        .where('t.userId = :userId AND t.debtId IS NOT NULL', { userId })
        .groupBy('t.debtId')
        .getRawMany<{ id: string; total: string }>(),
    ]);
    const paidBy = new Map(paidRows.map((p) => [p.id, Number(p.total)]));
    let payable = 0;
    let receivable = 0;
    for (const d of openDebts) {
      const outstanding = round2(Math.max(Number(d.principalAmount) - (paidBy.get(d.id) ?? 0), 0));
      if (d.direction === DebtDirection.PAYABLE) payable += outstanding;
      else receivable += outstanding;
    }

    const budgetLine = (total: number, count: number, budget: number) => ({
      total,
      count,
      budget,
      variance: round2(total - budget),
      executionRate: budget > 0 ? round2((total / budget) * 100) : null,
    });

    return {
      period: {
        from: q.from ?? null,
        to: q.to ?? null,
        label: this.periodLabel(q.from, q.to, month),
      },
      income: budgetLine(incomeTotal, incomeCount, incomeBudget),
      expense: budgetLine(expenseTotal, expenseCount, expenseBudget),
      net: {
        total: netTotal,
        isDeficit: netTotal < 0,
        status: netTotal > 0 ? 'superavit' : netTotal < 0 ? 'deficit' : 'equilibrado',
      },
      pending: { total: round2(num(raw?.pendingTotal)), count: int(raw?.pendingCount) },
      reconciled: { total: round2(num(raw?.reconciledTotal)), count: int(raw?.reconciledCount) },
      transfers: { total: round2(num(raw?.transferTotal)), count: int(raw?.transferCount) },
      debts: {
        openCount: openDebts.length,
        payable: round2(payable),
        receivable: round2(receivable),
      },
      totalCount: int(raw?.totalCount),
    };
  }

  /**
   * Componente "Distribución de Gastos": participación por rubro (ej. Gastos generales $15,144 57%).
   * Agrupa partidas en su rubro, calcula `percent = amount / total * 100` y compara contra `budgets`
   * no-`income` si el rango es un mes único (footer "Presupuesto original fijado / Exceso").
   */
  async getExpensesDistribution(userId: string, q: QueryTransactionSummaryDto) {
    return this.getDistribution(userId, q, TransactionType.EXPENSE);
  }

  /**
   * Componente "Fuentes de Ingreso": entradas efectivas vs metas (ej. Sueldo +$5,800 / $6,000).
   * Agrupa por rubro `income` y compara contra `budgets` del mes (footer "Cumplimiento total").
   */
  async getIncomeSources(userId: string, q: QueryTransactionSummaryDto) {
    const base = await this.getDistribution(userId, q, TransactionType.INCOME);
    const complianceRate = base.budgetTotal > 0 ? round2((base.total / base.budgetTotal) * 100) : null;
    return {
      total: base.total,
      budgetTotal: base.budgetTotal,
      complianceRate,
      totalLabel: `Total: $${base.total.toLocaleString('es-MX')}`,
      complianceLabel:
        complianceRate !== null ? `Cumplimiento total ingresos ${complianceRate}%` : 'Sin metas presupuestadas',
      items: base.items.map((i) => ({
        categoryId: i.categoryId,
        name: i.name,
        color: i.color,
        icon: i.icon,
        actual: i.amount,
        budget: i.budget,
        variance: i.variance,
        executionRate: i.budget > 0 ? round2((i.amount / i.budget) * 100) : null,
        count: i.count,
        label: `+$${i.amount.toLocaleString('es-MX')} / $${i.budget.toLocaleString('es-MX')}`,
      })),
    };
  }

  /** Núcleo compartido: agrupa por rubro, suma montos y presupuestos del mes. */
  private async getDistribution(userId: string, q: QueryTransactionSummaryDto, type: TransactionType) {
    const cats = await this.categories.find({ where: { userId } });
    const byId = new Map(cats.map((c) => [c.id, c]));
    const rootOf = (id: string): string => {
      let cur = byId.get(id);
      while (cur?.parentId && byId.has(cur.parentId)) cur = byId.get(cur.parentId);
      return cur?.id ?? id;
    };

    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoin('t.category', 'category')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type })
      .andWhere('t.categoryId IS NOT NULL');
    this.applyScopeFilters(qb, 't', userId, q);
    const rows = await qb.groupBy('t.categoryId').getRawMany<{ categoryId: string; total: string; count: string }>();

    const agg = new Map<string, { amount: number; count: number }>();
    for (const r of rows) {
      const rootId = rootOf(r.categoryId);
      const prev = agg.get(rootId) ?? { amount: 0, count: 0 };
      prev.amount += Number(r.total);
      prev.count += parseInt(r.count, 10) || 0;
      agg.set(rootId, prev);
    }
    const total = round2([...agg.values()].reduce((s, v) => s + v.amount, 0));

    // Presupuestos del mes agregados al rubro (propio + partidas).
    const budgetByRoot = new Map<string, number>();
    let budgetTotal = 0;
    const month = this.singleMonth(q.from, q.to);
    if (month) {
      const budgets = await this.budgets.find({ where: { userId, year: month.year, month: month.month } });
      for (const b of budgets) {
        const cat = byId.get(b.categoryId);
        if (!cat) continue;
        const isIncome = cat.kind === CategoryKind.INCOME;
        if ((type === TransactionType.INCOME) !== isIncome) continue;
        const rootId = rootOf(b.categoryId);
        budgetByRoot.set(rootId, (budgetByRoot.get(rootId) ?? 0) + Number(b.amount));
      }
      for (const [k, v] of budgetByRoot) budgetByRoot.set(k, round2(v));
      budgetTotal = round2([...budgetByRoot.values()].reduce((s, v) => s + v, 0));
    }

    const items = [...agg.entries()]
      .map(([rootId, v]) => {
        const root = byId.get(rootId);
        const amount = round2(v.amount);
        const budget = budgetByRoot.get(rootId) ?? 0;
        return {
          categoryId: rootId,
          name: root?.name ?? 'Sin categoría',
          color: root?.color ?? null,
          icon: root?.icon ?? null,
          amount,
          percent: total > 0 ? round2((amount / total) * 100) : 0,
          count: v.count,
          budget,
          variance: round2(amount - budget),
        };
      })
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const variance = round2(total - budgetTotal);
    return {
      period: { from: q.from ?? null, to: q.to ?? null, label: this.periodLabel(q.from, q.to, month) },
      total,
      budgetTotal,
      variance,
      isOverBudget: variance > 0,
      totalLabel: `Total: $${total.toLocaleString('es-MX')}`,
      budgetLabel: `Presupuesto original fijado: $${budgetTotal.toLocaleString('es-MX')}`,
      items,
    };
  }

  /** Aplica los filtros de alcance del listado (sin `type/status`) a un QueryBuilder ya creado. */
  private applyScopeFilters(
    qb: SelectQueryBuilder<Transaction>,
    alias: string,
    _userId: string,
    q: QueryTransactionSummaryDto,
  ) {
    const b = qb;
    if (q.from) b.andWhere(`${alias}.date >= :from`, { from: q.from });
    if (q.to) b.andWhere(`${alias}.date <= :to`, { to: q.to });
    if (q.paymentMethod) b.andWhere(`${alias}.paymentMethod = :pm`, { pm: q.paymentMethod });
    if (q.accountId) b.andWhere(`(${alias}.accountId = :acc OR ${alias}.destinationAccountId = :acc)`, { acc: q.accountId });
    if (q.categoryId) b.andWhere(`(${alias}.categoryId = :cat OR category.parentId = :cat)`, { cat: q.categoryId });
    if (q.search) {
      b.andWhere(
        new Brackets((s) =>
          s.where(`${alias}.concept ILIKE :s`).orWhere(`${alias}.description ILIKE :s`).orWhere(`${alias}.reference ILIKE :s`),
        ),
        { s: `%${q.search.replace(/[%_\\]/g, '\\$&')}%` },
      );
    }
  }

  /** Si `from/to` pertenecen al mismo YYYY-MM devuelve `{ year, month }`; sin filtros usa el mes actual. */
  private singleMonth(from?: string, to?: string): { year: number; month: number } | null {    const parse = (d?: string) => (d?.match(/^(\d{4})-(\d{2})-\d{2}$/) ? d : null);
    const f = parse(from);
    const t = parse(to);
    if (f && t && f.slice(0, 7) === t.slice(0, 7)) {
      return { year: Number(f.slice(0, 4)), month: Number(f.slice(5, 7)) };
    }
    if (!from && !to) {
      const now = new Date();
      return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    }
    return null;
  }

  private periodLabel(from?: string, to?: string, month?: { year: number; month: number } | null): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    if (month) return `${meses[month.month - 1]} ${month.year}`;
    if (from || to) return `${from ?? '…'} – ${to ?? '…'}`;
    return 'Todos los movimientos';
  }

  async findOne(userId: string, id: string) {
    const tx = await this.repo.findOne({
      where: { id, userId },
      relations: { account: true, destinationAccount: true, category: true, debt: true },
    });
    if (!tx) throw new NotFoundException('Movimiento no encontrado');
    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Movimiento no encontrado');

    const state: State = {
      type: dto.type ?? tx.type,
      accountId: dto.accountId ?? tx.accountId,
      destinationAccountId: dto.destinationAccountId ?? tx.destinationAccountId,
      categoryId: dto.categoryId ?? tx.categoryId,
      debtId: dto.debtId ?? tx.debtId,
    };
    // Si cambia a transferencia se limpia la categoría; si deja de serlo, se limpia el destino.
    if (state.type === TransactionType.TRANSFER && !dto.categoryId) state.categoryId = null;
    if (state.type !== TransactionType.TRANSFER && !dto.destinationAccountId) state.destinationAccountId = null;
    await this.validate(userId, state);

    const { status, ...rest } = dto;
    // Las relaciones cargadas no deben pisar las columnas FK al guardar.
    Object.assign(tx, rest, state);
    if (status && status !== tx.status) {
      tx.status = status;
      tx.reconciledAt = status === TransactionStatus.RECONCILED ? new Date() : null;
    }
    await this.repo.save(tx);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Movimiento no encontrado');
  }

  async reconcile(userId: string, ids: string[]) {
    const res = await this.repo.update(
      { userId, id: In(ids), status: TransactionStatus.PENDING },
      { status: TransactionStatus.RECONCILED, reconciledAt: new Date() },
    );
    return { updated: res.affected ?? 0 };
  }

  // ---------- reglas de negocio ----------
  private async validate(userId: string, s: State) {
    await this.assertOwned(this.accounts, s.accountId, userId, 'Cuenta');

    if (s.type === TransactionType.TRANSFER) {
      if (!s.destinationAccountId) throw new BadRequestException('La transferencia requiere cuenta destino');
      if (s.destinationAccountId === s.accountId) {
        throw new BadRequestException('La cuenta origen y destino deben ser distintas');
      }
      await this.assertOwned(this.accounts, s.destinationAccountId, userId, 'Cuenta destino');
      if (s.categoryId) throw new BadRequestException('Las transferencias no llevan categoría');
    } else {
      if (s.destinationAccountId) throw new BadRequestException('Solo las transferencias llevan cuenta destino');
      if (!s.categoryId) throw new BadRequestException('La categoría es obligatoria');
      const category = await this.categories.findOne({ where: { id: s.categoryId, userId } });
      if (!category) throw new NotFoundException('Categoría no encontrada');
      const isIncomeCategory = category.kind === CategoryKind.INCOME;
      if ((s.type === TransactionType.INCOME) !== isIncomeCategory) {
        throw new BadRequestException('La categoría no corresponde al tipo de movimiento');
      }
    }

    if (s.debtId) await this.assertOwned(this.debts, s.debtId, userId, 'Pasivo');
  }

  private async assertOwned(repo: Repository<ObjectLiteral>, id: string, userId: string, label: string) {
    if (!(await repo.count({ where: { id, userId } }))) throw new NotFoundException(`${label} no encontrado`);
  }
}
