import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { round2 } from '../../common/decimal.transformer';
import { SavingsGoalEntryKind, TransactionStatus, TransactionType } from '../../common/enums';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import {
  CreateSavingsGoalDto,
  DepositSavingsGoalDto,
  GoalProgressQueryDto,
  QueryGoalEntriesDto,
  UpdateSavingsGoalDto,
  WithdrawSavingsGoalDto,
} from './dto/savings-goal.dto';
import { SavingsGoalEntry } from './savings-goal-entry.entity';
import { SavingsGoal } from './savings-goal.entity';

@Injectable()
export class SavingsGoalsService {
  constructor(
    @InjectRepository(SavingsGoal) private readonly repo: Repository<SavingsGoal>,
    @InjectRepository(SavingsGoalEntry) private readonly entries: Repository<SavingsGoalEntry>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateSavingsGoalDto) {
    await this.assertRefs(userId, dto);
    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  findAll(userId: string) {
    return this.repo.find({ where: { userId }, relations: { account: true, category: true }, order: { name: 'ASC' } });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.repo.findOne({ where: { id, userId }, relations: { account: true, category: true } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    const goal = await this.findOne(userId, id);
    await this.assertRefs(userId, dto);
    Object.assign(goal, dto);
    await this.repo.save(goal);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Meta no encontrada');
  }

  /**
   * Aporte a la meta: registra el ledger y mueve dinero real operativa → reserva.
   * Si la meta no tiene cuenta reserva (modo virtual) solo se registra el ledger.
   */
  async deposit(userId: string, goalId: string, dto: DepositSavingsGoalDto) {
    const goal = await this.findOne(userId, goalId);
    const from = await this.assertOwnedAccount(userId, dto.fromAccountId);

    const reserveId = goal.accountId;
    const needsTransfer = !!reserveId && reserveId !== from.id;
    if (reserveId && reserveId === from.id) {
      throw new BadRequestException('La cuenta origen ya es la reserva de la meta; usa otra cuenta operativa');
    }
    if (reserveId) await this.assertOwnedAccount(userId, reserveId);

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      let transactionId: string | null = null;
      if (needsTransfer && reserveId) {
        const tx = await runner.manager.save(
          Transaction,
          runner.manager.create(Transaction, {
            userId,
            type: TransactionType.TRANSFER,
            accountId: from.id,
            destinationAccountId: reserveId,
            categoryId: null,
            amount: dto.amount,
            date: dto.date,
            concept: dto.concept ?? `Aporte ${goal.name}`,
            status: TransactionStatus.PENDING,
            reconciledAt: null,
          }),
        );
        transactionId = tx.id;
      }

      const entry = await runner.manager.save(
        SavingsGoalEntry,
        runner.manager.create(SavingsGoalEntry, {
          userId,
          goalId: goal.id,
          kind: SavingsGoalEntryKind.DEPOSIT,
          amount: dto.amount,
          date: dto.date,
          accountId: from.id,
          transactionId,
          concept: dto.concept ?? `Aporte ${goal.name}`,
        }),
      );
      await runner.commitTransaction();
      return this.findEntry(userId, entry.id);
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }
  }

  /**
   * Retiro de la meta: valida saldo del ledger y mueve dinero real reserva → operativa.
   */
  async withdraw(userId: string, goalId: string, dto: WithdrawSavingsGoalDto) {
    const goal = await this.findOne(userId, goalId);
    const { balance } = await this.balance(userId, goalId);
    if (dto.amount > balance) {
      throw new BadRequestException(`Fondos insuficientes en la meta (saldo ${balance})`);
    }

    const reserveId = goal.accountId;
    const toId = dto.toAccountId ?? reserveId ?? undefined;
    let toAccount: Account | null = null;
    if (toId) toAccount = await this.assertOwnedAccount(userId, toId);
    else {
      // Sin cuenta destino explícita ni reserva: usa la cuenta del último aporte o la primera propia.
      const last = await this.entries.findOne({ where: { userId, goalId }, order: { date: 'DESC', createdAt: 'DESC' } });
      const fallbackId = last?.accountId ?? (await this.accounts.findOne({ where: { userId }, order: { name: 'ASC' } }))?.id;
      if (!fallbackId) throw new NotFoundException('Cuenta no encontrada');
      toAccount = await this.assertOwnedAccount(userId, fallbackId);
    }

    const needsTransfer = !!reserveId && toAccount && reserveId !== toAccount.id;
    if (reserveId && toAccount && reserveId === toAccount.id) {
      throw new BadRequestException('La cuenta destino ya es la reserva de la meta; elige otra cuenta operativa');
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      let transactionId: string | null = null;
      if (needsTransfer && reserveId && toAccount) {
        const tx = await runner.manager.save(
          Transaction,
          runner.manager.create(Transaction, {
            userId,
            type: TransactionType.TRANSFER,
            accountId: reserveId,
            destinationAccountId: toAccount.id,
            categoryId: null,
            amount: dto.amount,
            date: dto.date,
            concept: dto.concept ?? `Retiro ${goal.name}`,
            status: TransactionStatus.PENDING,
            reconciledAt: null,
          }),
        );
        transactionId = tx.id;
      }

      const entry = await runner.manager.save(
        SavingsGoalEntry,
        runner.manager.create(SavingsGoalEntry, {
          userId,
          goalId: goal.id,
          kind: SavingsGoalEntryKind.WITHDRAWAL,
          amount: dto.amount,
          date: dto.date,
          accountId: toAccount!.id,
          transactionId,
          concept: dto.concept ?? `Retiro ${goal.name}`,
        }),
      );
      await runner.commitTransaction();
      return this.findEntry(userId, entry.id);
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }
  }

  /** Historial del ledger de una meta (más recientes primero). */
  async listEntries(userId: string, goalId: string, q: QueryGoalEntriesDto) {
    await this.findOne(userId, goalId);
    const qb = this.entries
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.account', 'account')
      .leftJoinAndSelect('e.transaction', 'transaction')
      .where('e.userId = :userId', { userId })
      .andWhere('e.goalId = :goalId', { goalId });
    if (q.from) qb.andWhere('e.date >= :from', { from: q.from });
    if (q.to) qb.andWhere('e.date <= :to', { to: q.to });
    qb.orderBy('e.date', 'DESC').addOrderBy('e.createdAt', 'DESC');
    return qb.getMany();
  }

  /** Saldo neto del ledger: depósitos − retiros. */
  async balance(userId: string, goalId: string) {
    const goal = await this.findOne(userId, goalId);
    const row = await this.entries
      .createQueryBuilder('e')
      .select('COALESCE(SUM(CASE WHEN e.kind = :deposit THEN e.amount ELSE 0 END), 0)', 'deposited')
      .addSelect('COALESCE(SUM(CASE WHEN e.kind = :withdrawal THEN e.amount ELSE 0 END), 0)', 'withdrawn')
      .addSelect('COUNT(e.id)', 'count')
      .where('e.userId = :userId', { userId })
      .andWhere('e.goalId = :goalId', { goalId })
      .setParameters({ deposit: SavingsGoalEntryKind.DEPOSIT, withdrawal: SavingsGoalEntryKind.WITHDRAWAL })
      .getRawOne<{ deposited: string; withdrawn: string; count: string }>();
    const deposited = Number(row?.deposited ?? 0);
    const withdrawn = Number(row?.withdrawn ?? 0);
    return {
      goal,
      balance: round2(deposited - withdrawn),
      totalDeposited: round2(deposited),
      totalWithdrawn: round2(withdrawn),
      entriesCount: Number(row?.count ?? 0),
    };
  }

  /** Revierte un movimiento del ledger y borra su transferencia asociada. */
  async removeEntry(userId: string, goalId: string, entryId: string) {
    const entry = await this.entries.findOne({ where: { id: entryId, goalId, userId } });
    if (!entry) throw new NotFoundException('Movimiento no encontrado');
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      if (entry.transactionId) await runner.manager.delete(Transaction, { id: entry.transactionId, userId });
      await runner.manager.delete(SavingsGoalEntry, { id: entry.id, userId });
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }
  }

  /**
   * Avance del mes.
   * - Con ledger (≥1 movimiento): `contributed` = depósitos − retiros del mes, `total` = neto histórico.
   * - Sin ledger (compat): fallback a egresos del mes en `categoryId` (comportamiento anterior).
   */
  async progress(userId: string, q: GoalProgressQueryDto) {
    const mm = String(q.month).padStart(2, '0');
    const last = String(new Date(Date.UTC(q.year, q.month, 0)).getUTCDate()).padStart(2, '0');
    const from = `${q.year}-${mm}-01`;
    const to = `${q.year}-${mm}-${last}`;

    const goals = await this.repo.find({ where: { userId, isActive: true }, relations: { account: true, category: true } });
    const result = [];
    for (const goal of goals) {
      const ledger = await this.entries
        .createQueryBuilder('e')
        .select('COALESCE(SUM(CASE WHEN e.kind = :deposit AND e.date BETWEEN :from AND :to THEN e.amount ELSE 0 END), 0)', 'depMonth')
        .addSelect('COALESCE(SUM(CASE WHEN e.kind = :withdrawal AND e.date BETWEEN :from AND :to THEN e.amount ELSE 0 END), 0)', 'wdMonth')
        .addSelect('COALESCE(SUM(CASE WHEN e.kind = :deposit THEN e.amount ELSE 0 END), 0)', 'depTotal')
        .addSelect('COALESCE(SUM(CASE WHEN e.kind = :withdrawal THEN e.amount ELSE 0 END), 0)', 'wdTotal')
        .addSelect('COUNT(e.id)', 'count')
        .where('e.userId = :userId', { userId })
        .andWhere('e.goalId = :goalId', { goalId: goal.id })
        .setParameters({ deposit: SavingsGoalEntryKind.DEPOSIT, withdrawal: SavingsGoalEntryKind.WITHDRAWAL, from, to })
        .getRawOne<{ depMonth: string; wdMonth: string; depTotal: string; wdTotal: string; count: string }>();

      let contributed = 0;
      let total = 0;
      let source: 'ledger' | 'category' = 'ledger';
      let depositsMonth = 0;
      let withdrawalsMonth = 0;

      if (Number(ledger?.count ?? 0) > 0) {
        depositsMonth = Number(ledger?.depMonth ?? 0);
        withdrawalsMonth = Number(ledger?.wdMonth ?? 0);
        contributed = depositsMonth - withdrawalsMonth;
        total = Number(ledger?.depTotal ?? 0) - Number(ledger?.wdTotal ?? 0);
      } else if (goal.categoryId) {
        source = 'category';
        const row = await this.txRepo
          .createQueryBuilder('t')
          .innerJoin('t.category', 'c')
          .select('COALESCE(SUM(CASE WHEN t.date BETWEEN :from AND :to THEN t.amount ELSE 0 END), 0)', 'month')
          .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
          .where('t.userId = :userId', { userId })
          .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
          .andWhere('(t.categoryId = :cat OR c.parentId = :cat)', { cat: goal.categoryId })
          .setParameters({ from, to })
          .getRawOne<{ month: string; total: string }>();
        contributed = Number(row?.month ?? 0);
        total = Number(row?.total ?? 0);
      }

      const target = Number(goal.monthlyContribution);
      result.push({
        goal,
        period: { year: q.year, month: q.month },
        contributed: round2(contributed),
        monthlyTarget: target,
        percent: target > 0 ? round2((contributed / target) * 100) : null,
        remaining: round2(Math.max(target - contributed, 0)),
        totalContributed: round2(total),
        targetProgressPercent: goal.targetAmount ? round2((total / Number(goal.targetAmount)) * 100) : null,
        depositsMonth: round2(depositsMonth),
        withdrawalsMonth: round2(withdrawalsMonth),
        source,
      });
    }
    return result;
  }

  private async findEntry(userId: string, id: string) {
    const entry = await this.entries.findOne({
      where: { id, userId },
      relations: { account: true, transaction: true, goal: true },
    });
    if (!entry) throw new NotFoundException('Movimiento no encontrado');
    return entry;
  }

  private async assertOwnedAccount(userId: string, id: string) {
    const account = await this.accounts.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  private async assertRefs(userId: string, dto: { accountId?: string; categoryId?: string }) {
    if (dto.accountId && !(await this.accounts.count({ where: { id: dto.accountId, userId } }))) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    if (dto.categoryId && !(await this.categories.count({ where: { id: dto.categoryId, userId } }))) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }
}
