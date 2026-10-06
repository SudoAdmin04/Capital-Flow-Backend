import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionType } from '../../common/enums';
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
  async getBalances(userId: string): Promise<AccountWithBalance[]> {
    const accounts = await this.repo.find({ where: { userId }, order: { isPrimary: 'DESC', name: 'ASC' } });

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
}
