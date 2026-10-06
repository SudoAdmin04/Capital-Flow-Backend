import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, ObjectLiteral, Repository } from 'typeorm';
import { CategoryKind, TransactionStatus, TransactionType } from '../../common/enums';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Debt } from '../debts/debt.entity';
import { CreateTransactionDto, QueryTransactionsDto, UpdateTransactionDto } from './dto/transaction.dto';
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
