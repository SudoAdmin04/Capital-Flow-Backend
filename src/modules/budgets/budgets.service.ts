import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdjustmentSource } from '../../common/enums';
import { rethrowUnique } from '../../common/db-errors';
import { Category } from '../categories/category.entity';
import { BudgetAdjustment } from './budget-adjustment.entity';
import { Budget } from './budget.entity';
import { CopyBudgetsDto, CreateBudgetDto, QueryBudgetsDto, UpdateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly repo: Repository<Budget>,
    @InjectRepository(BudgetAdjustment) private readonly adjustments: Repository<BudgetAdjustment>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
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
}
