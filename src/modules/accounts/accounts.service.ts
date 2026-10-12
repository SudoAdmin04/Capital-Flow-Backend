import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountType, TransactionStatus, TransactionType } from '../../common/enums';
import { rethrowUnique } from '../../common/db-errors';
import { round2 } from '../../common/decimal.transformer';
import { Transaction } from '../transactions/transaction.entity';
import { Account } from './account.entity';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

export type AccountWithBalance = Account & { balance: number };

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account) private readonly repo: Repository<Account>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateAccountDto) {
    try {
      if (dto.isPrimary) await this.repo.update({ userId }, { isPrimary: false });
      return await this.repo.save(this.repo.create({ ...dto, userId }));
    } catch (e) {
      rethrowUnique(e, 'Ya tienes una cuenta con ese nombre');
    }
  }

  findAll(userId: string) {
    return this.getBalances(userId);
  }

  async findOne(userId: string, id: string) {
    const account = await this.repo.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  async findOneWithBalance(userId: string, id: string) {
    const all = await this.getBalances(userId);
    const account = all.find((a) => a.id === id);
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.findOne(userId, id);
    try {
      if (dto.isPrimary) await this.repo.update({ userId }, { isPrimary: false });
      Object.assign(account, dto);
      return await this.repo.save(account);
    } catch (e) {
      rethrowUnique(e, 'Ya tienes una cuenta con ese nombre');
    }
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const used = await this.txRepo.count({
      where: [
        { userId, accountId: id },
        { userId, destinationAccountId: id },
      ],
    });
    if (used) throw new ConflictException('La cuenta tiene movimientos; desactívala en lugar de eliminarla');
    await this.repo.delete({ id, userId });
  }

  /**
   * Saldo = saldo inicial + ingresos - egresos - transferencias salientes + transferencias entrantes.
   */
  async getBalances(userId: string): Promise<AccountWithBalance[]> {    const accounts = await this.repo.find({ where: { userId }, order: { isPrimary: 'DESC', name: 'ASC' } });

    const outgoing = await this.txRepo
      .createQueryBuilder('t')
      .select('t.accountId', 'id')
      .addSelect('SUM(CASE WHEN t.type = :income THEN t.amount ELSE -t.amount END)', 'total')
      .where('t.userId = :userId', { userId })
      .setParameter('income', TransactionType.INCOME)
      .groupBy('t.accountId')
      .getRawMany<{ id: string; total: string }>();

    const incoming = await this.txRepo
      .createQueryBuilder('t')
      .select('t.destinationAccountId', 'id')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :transfer', { transfer: TransactionType.TRANSFER })
      .andWhere('t.destinationAccountId IS NOT NULL')
      .groupBy('t.destinationAccountId')
      .getRawMany<{ id: string; total: string }>();

    const delta = new Map<string, number>();
    for (const r of outgoing) delta.set(r.id, (delta.get(r.id) ?? 0) + Number(r.total));
    for (const r of incoming) delta.set(r.id, (delta.get(r.id) ?? 0) + Number(r.total));

    return accounts.map((a) => Object.assign(a, { balance: round2(Number(a.initialBalance) + (delta.get(a.id) ?? 0)) }));
  }

  /**
   * Cartas "Resumen general": saldo total de activas, conteo e cuenta principal.
   * Ej. `$21,330` (4 activas), `4 / 4` (0 inactivas), principal `$10,950`.
   */
  async getSummary(userId: string) {
    const balances = await this.getBalances(userId);
    const active = balances.filter((a) => a.isActive);
    const totalBalance = round2(active.reduce((s, a) => s + a.balance, 0));
    const primary = balances.find((a) => a.isPrimary) ?? active[0] ?? null;
    return {
      totalBalance,
      activeCount: active.length,
      inactiveCount: balances.length - active.length,
      totalCount: balances.length,
      label: `${active.length} / ${balances.length}`,
      primary: primary
        ? { id: primary.id, name: primary.name, type: primary.type, balance: primary.balance }
        : null,
    };
  }

  /**
   * Componente "Distribución de Activos": barra + filas por tipo.
   * Total = `checking + savings + cash` activas (ej. $20,830 = $12,450 60% + $5,200 25% + $3,180 15%).
   * `credit_card` se informa aparte y no suma al total de activos.
   */
  async getAssetsDistribution(userId: string) {
    const balances = await this.getBalances(userId);
    const active = balances.filter((a) => a.isActive);
    const liquidTypes = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CASH];
    const totalActivos = round2(
      active.filter((a) => liquidTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0),
    );
    const labels: Record<string, string> = {
      [AccountType.CHECKING]: 'Cuentas Corrientes',
      [AccountType.SAVINGS]: 'Reserva / Ahorro',
      [AccountType.CASH]: 'Caja y Efectivo',
      [AccountType.CREDIT_CARD]: 'Tarjetas de Crédito',
    };
    const items = liquidTypes.map((type) => {
      const group = active.filter((a) => a.type === type);
      const balance = round2(group.reduce((s, a) => s + a.balance, 0));
      return {
        key: type,
        label: labels[type],
        balance,
        percent: totalActivos > 0 ? round2((balance / totalActivos) * 100) : 0,
        count: group.length,
      };
    });
    return {
      totalActivos,
      label: `Total Activos: $${totalActivos.toFixed(2)}`,
      items,
    };
  }

  /**
   * Componente "Conciliación Rápida": `% completado`, `X de Y cuadradas` y pendientes recientes.
   * Una cuenta está "cuadrada" si no tiene movimientos `pending` (ej. "10 de 11 Cuadradas",
   * "1 movimiento por conciliar en Préstamo #D892").
   */
  async getReconciliation(userId: string) {
    const balances = await this.getBalances(userId);
    const active = balances.filter((a) => a.isActive);
    const nameById = new Map(active.map((a) => [a.id, a.name]));

    const rows = await this.txRepo
      .createQueryBuilder('t')
      .leftJoin('t.debt', 'debt')
      .select('t.accountId', 'accountId')
      .addSelect('COUNT(t.id)', 'total')
      .addSelect(`SUM(CASE WHEN t.status = :reconciled THEN 1 ELSE 0 END)`, 'reconciled')
      .addSelect(`SUM(CASE WHEN t.status = :pending THEN 1 ELSE 0 END)`, 'pending')
      .addSelect(`SUM(CASE WHEN t.status = :pending THEN t.amount ELSE 0 END)`, 'pendingAmount')
      .where('t.userId = :userId', { userId })
      .setParameters({ reconciled: TransactionStatus.RECONCILED, pending: TransactionStatus.PENDING })
      .groupBy('t.accountId')
      .getRawMany<{ accountId: string; total: string; reconciled: string; pending: string; pendingAmount: string }>();
    const byAcc = new Map(rows.map((r) => [r.accountId, r]));

    const byAccount = active.map((a) => {
      const r = byAcc.get(a.id);
      const total = r ? parseInt(r.total, 10) || 0 : 0;
      const reconciled = r ? parseInt(r.reconciled, 10) || 0 : 0;
      const pending = r ? parseInt(r.pending, 10) || 0 : 0;
      return {
        accountId: a.id,
        accountName: a.name,
        total,
        reconciled,
        pending,
        pendingAmount: round2(Number(r?.pendingAmount ?? 0) || 0),
        isSquared: pending === 0,
      };
    });

    // Movimientos en cuentas sin movimientos no aparecen en el GROUP BY: ya están como cuadradas.
    const totals = await this.txRepo
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'total')
      .addSelect(`SUM(CASE WHEN t.status = :reconciled THEN 1 ELSE 0 END)`, 'reconciled')
      .addSelect(`SUM(CASE WHEN t.status = :pending THEN 1 ELSE 0 END)`, 'pending')
      .addSelect(`SUM(CASE WHEN t.status = :pending THEN t.amount ELSE 0 END)`, 'pendingAmount')
      .where('t.userId = :userId', { userId })
      .setParameters({ reconciled: TransactionStatus.RECONCILED, pending: TransactionStatus.PENDING })
      .getRawOne<{ total: string; reconciled: string; pending: string; pendingAmount: string }>();

    const total = parseInt(totals?.total ?? '0', 10) || 0;
    const reconciledCount = parseInt(totals?.reconciled ?? '0', 10) || 0;
    const pendingCount = parseInt(totals?.pending ?? '0', 10) || 0;
    const completionRate = total > 0 ? round2((reconciledCount / total) * 100) : 100;
    const squaredAccounts = byAccount.filter((b) => b.isSquared).length;

    const recent = await this.txRepo
      .createQueryBuilder('t')
      .leftJoin('t.debt', 'debt')
      .select('t.id', 'id')
      .addSelect('t.concept', 'concept')
      .addSelect('t.amount', 'amount')
      .addSelect('t.date', 'date')
      .addSelect('t.accountId', 'accountId')
      .addSelect('debt.reference', 'debtReference')
      .where('t.userId = :userId AND t.status = :pending', { userId, pending: TransactionStatus.PENDING })
      .orderBy('t.date', 'DESC')
      .limit(5)
      .getRawMany<{ id: string; concept: string; amount: string; date: string; accountId: string; debtReference: string | null }>();

    return {
      total,
      reconciledCount,
      pendingCount,
      pendingAmount: round2(Number(totals?.pendingAmount ?? 0) || 0),
      completionRate,
      completionLabel: `${completionRate}% Completado`,
      squaredAccounts,
      totalAccounts: active.length,
      statusLabel: `${squaredAccounts} de ${active.length} Cuadradas`,
      byAccount,
      recentPending: recent.map((r) => ({
        id: r.id,
        concept: r.concept,
        amount: Number(r.amount),
        date: r.date,
        accountName: nameById.get(r.accountId) ?? 'Cuenta',
        debtReference: r.debtReference,
      })),
    };
  }
}
