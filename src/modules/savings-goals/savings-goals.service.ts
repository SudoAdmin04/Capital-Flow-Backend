import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { round2 } from '../../common/decimal.transformer';
import { TransactionType } from '../../common/enums';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateSavingsGoalDto, GoalProgressQueryDto, UpdateSavingsGoalDto } from './dto/savings-goal.dto';
import { SavingsGoal } from './savings-goal.entity';

@Injectable()
export class SavingsGoalsService {
  constructor(
    @InjectRepository(SavingsGoal) private readonly repo: Repository<SavingsGoal>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
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

  /** Avance del mes: aportes del periodo vs meta mensual, y acumulado histórico. */
  async progress(userId: string, q: GoalProgressQueryDto) {
    const mm = String(q.month).padStart(2, '0');
    const last = String(new Date(Date.UTC(q.year, q.month, 0)).getUTCDate()).padStart(2, '0');
    const from = `${q.year}-${mm}-01`;
    const to = `${q.year}-${mm}-${last}`;

    const goals = await this.repo.find({ where: { userId, isActive: true }, relations: { account: true, category: true } });
    const result = [];
    for (const goal of goals) {
      let contributed = 0;
      let total = 0;
      if (goal.categoryId) {
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
      });
    }
    return result;
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
