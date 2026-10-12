import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtDirection, DebtStatus } from '../../common/enums';
import { round2 } from '../../common/decimal.transformer';
import { Transaction } from '../transactions/transaction.entity';
import { Debt } from './debt.entity';
import { CreateDebtDto, UpdateDebtDto } from './dto/debt.dto';

export type DebtWithBalance = Debt & { paidAmount: number; outstanding: number };

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt) private readonly repo: Repository<Debt>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  create(userId: string, dto: CreateDebtDto) {
    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  async findAll(userId: string, status?: DebtStatus): Promise<DebtWithBalance[]> {
    const debts = await this.repo.find({
      where: { userId, ...(status ? { status } : {}) },
      order: { status: 'ASC', dueDate: 'ASC', createdAt: 'DESC' },
    });
    if (!debts.length) return [];
    const paid = await this.txRepo
      .createQueryBuilder('t')
      .select('t.debtId', 'id')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId AND t.debtId IS NOT NULL', { userId })
      .groupBy('t.debtId')
      .getRawMany<{ id: string; total: string }>();
    const paidBy = new Map(paid.map((p) => [p.id, Number(p.total)]));
    return debts.map((d) => {
      const paidAmount = paidBy.get(d.id) ?? 0;
      return Object.assign(d, { paidAmount, outstanding: round2(Math.max(Number(d.principalAmount) - paidAmount, 0)) });
    });
  }

  async findOne(userId: string, id: string) {
    const debt = (await this.findAll(userId)).find((d) => d.id === id);
    if (!debt) throw new NotFoundException('Pasivo no encontrado');
    return debt;
  }

  async update(userId: string, id: string, dto: UpdateDebtDto) {
    const debt = await this.repo.findOne({ where: { id, userId } });
    if (!debt) throw new NotFoundException('Pasivo no encontrado');
    Object.assign(debt, dto);
    await this.repo.save(debt);
    return this.findOne(userId, id);
  }

  settle(userId: string, id: string) {
    return this.update(userId, id, { status: DebtStatus.PAID });
  }

  async remove(userId: string, id: string) {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Pasivo no encontrado');
  }

  /** Totales abiertos para el patrimonio neto. */
  async summary(userId: string) {
    const open = await this.findAll(userId, DebtStatus.OPEN);
    const sum = (dir: DebtDirection) =>
      round2(open.filter((d) => d.direction === dir).reduce((acc, d) => acc + d.outstanding, 0));
    return { payable: sum(DebtDirection.PAYABLE), receivable: sum(DebtDirection.RECEIVABLE), open };
  }

  /**
   * Stats para las 4 cards de la página de deudas.
   * Solo considera `status=open`. `outstanding = max(principal − pagado, 0)`.
   * Vencida = `dueDate < hoy` (comparación por fecha YYYY-MM-DD).
   */
  async stats(userId: string) {
    const open = await this.findAll(userId, DebtStatus.OPEN);

    const payableList = open.filter((d) => d.direction === DebtDirection.PAYABLE);
    const receivableList = open.filter((d) => d.direction === DebtDirection.RECEIVABLE);

    const payableAmount = round2(payableList.reduce((s, d) => s + d.outstanding, 0));
    const receivableAmount = round2(receivableList.reduce((s, d) => s + d.outstanding, 0));
    const outstandingAmount = round2(payableAmount + receivableAmount);
    const principal = round2(open.reduce((s, d) => s + Number(d.principalAmount), 0));

    const today = new Date().toISOString().slice(0, 10);
    const overdueCount = open.filter((d) => d.dueDate != null && d.dueDate < today).length;

    return {
      porPagar: { amount: payableAmount, count: payableList.length },
      porCobrar: { amount: receivableAmount, count: receivableList.length },
      saldoVivoVigente: { amount: outstandingAmount, principal, count: open.length },
      vencidas: { count: overdueCount, totalVigentes: open.length },
    };
  }
}
