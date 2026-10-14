import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { round2 } from '../../../common/decimal.transformer';
import { Category } from '../../categories/category.entity';
import { Budget } from '../budget.entity';
import { BudgetCalendarEvent } from './budget-calendar-event.entity';
import { CreateCalendarEventDto, QueryCalendarDto, UpdateCalendarEventDto } from './dto/budget-calendar.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

function toDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function toIsoDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

@Injectable()
export class BudgetCalendarService {
  constructor(
    @InjectRepository(BudgetCalendarEvent) private readonly repo: Repository<BudgetCalendarEvent>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Budget) private readonly budgets: Repository<Budget>,
  ) {}

  /** Normaliza query strings: `''` / solo-espacios se tratan como ausentes (filtro opcional). */
  private clean(value: string | undefined): string | undefined {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  /** Rango por defecto = mes actual (como las vistas Month del mockup). */
  private resolveRange(q: QueryCalendarDto): { from: string; to: string } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const mm = String(m).padStart(2, '0');
    const last = String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0');
    const from = this.clean(q.from) ?? `${y}-${mm}-01`;
    const to = this.clean(q.to) ?? `${y}-${mm}-${last}`;
    if (from > to) throw new BadRequestException('`from` debe ser ≤ `to`');
    if (toDay(to) - toDay(from) > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`El rango no puede superar ${MAX_RANGE_DAYS} días`);
    }
    return { from, to };
  }

  private validateEventDates(startDate: string, endDate: string) {
    if (startDate > endDate) throw new BadRequestException('`endDate` debe ser ≥ `startDate`');
    if (toDay(endDate) - toDay(startDate) > MAX_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Un evento no puede durar más de ${MAX_RANGE_DAYS} días`);
    }
  }

  private async checkCategory(userId: string, categoryId: string): Promise<Category> {
    const cat = await this.categories.findOne({ where: { id: categoryId, userId } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  private async checkBudget(userId: string, budgetId: string) {
    const budget = await this.budgets.findOne({ where: { id: budgetId, userId } });
    if (!budget) throw new NotFoundException('Presupuesto vinculado no encontrado');
  }

  /** Vista Day/Week/Month: eventos que solapan `[from, to]` + mapa por día para pintar casillas. */
  async findByRange(userId: string, q: QueryCalendarDto) {
    const { from, to } = this.resolveRange(q);
    const qb = this.repo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.category', 'c')
      .where('e.userId = :userId', { userId })
      .andWhere('e.startDate <= :to AND e.endDate >= :from', { from, to })
      .orderBy('e.startDate', 'ASC')
      .addOrderBy('e.endDate', 'ASC')
      .addOrderBy('e.createdAt', 'ASC');
    const categoryId = this.clean(q.categoryId);
    const kind = this.clean(q.kind);
    if (categoryId) qb.andWhere('e.categoryId = :cat', { cat: categoryId });
    if (kind) qb.andWhere('c.kind = :kind', { kind });
    const rows = await qb.getMany();

    const events = rows.map((e) => {
      const spanDays = Math.round((toDay(e.endDate) - toDay(e.startDate)) / DAY_MS) + 1;
      const visibleStart = e.startDate < from ? from : e.startDate;
      const visibleEnd = e.endDate > to ? to : e.endDate;
      const visibleDays: string[] = [];
      for (let ts = toDay(visibleStart); ts <= toDay(visibleEnd); ts += DAY_MS) visibleDays.push(toIsoDay(ts));
      return {
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        startDate: e.startDate,
        endDate: e.endDate,
        isMultiDay: e.endDate > e.startDate,
        spanDays,
        visibleStart,
        visibleEnd,
        visibleDays,
        color: e.color ?? e.category.color,
        isAllDay: e.isAllDay,
        category: {
          id: e.category.id,
          name: e.category.name,
          kind: e.category.kind,
          color: e.category.color,
          icon: e.category.icon,
        },
        budgetId: e.budgetId,
        notes: e.notes,
      };
    });

    const days: Record<string, string[]> = {};
    for (const ev of events) for (const d of ev.visibleDays) (days[d] ??= []).push(ev.id);

    return {
      range: { from, to },
      events,
      days,
      count: events.length,
      totalAmount: round2(events.reduce((s, e) => s + e.amount, 0)),
    };
  }

  async findOne(userId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, userId }, relations: { category: true } });
    if (!e) throw new NotFoundException('Evento del calendario no encontrado');
    const spanDays = Math.round((toDay(e.endDate) - toDay(e.startDate)) / DAY_MS) + 1;
    const visibleDays: string[] = [];
    for (let ts = toDay(e.startDate); ts <= toDay(e.endDate); ts += DAY_MS) visibleDays.push(toIsoDay(ts));
    return {
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      startDate: e.startDate,
      endDate: e.endDate,
      isMultiDay: e.endDate > e.startDate,
      spanDays,
      visibleStart: e.startDate,
      visibleEnd: e.endDate,
      visibleDays,
      color: e.color ?? e.category.color,
      isAllDay: e.isAllDay,
      category: {
        id: e.category.id,
        name: e.category.name,
        kind: e.category.kind,
        color: e.category.color,
        icon: e.category.icon,
      },
      budgetId: e.budgetId,
      notes: e.notes,
    };
  }

  /** Agenda un presupuesto en el calendario (1 día o barra multidía). */
  async create(userId: string, dto: CreateCalendarEventDto) {
    const budgetId = this.clean(dto.budgetId) ?? null;
    this.validateEventDates(dto.startDate, dto.endDate);
    const category = await this.checkCategory(userId, dto.categoryId);
    if (budgetId) await this.checkBudget(userId, budgetId);
    const saved = await this.repo.save(
      this.repo.create({
        userId,
        categoryId: dto.categoryId,
        budgetId,
        title: dto.title?.trim() || category.name,
        amount: dto.amount,
        startDate: dto.startDate,
        endDate: dto.endDate,
        notes: dto.notes ?? null,
        color: dto.color ?? null,
        isAllDay: dto.isAllDay ?? true,
      }),
    );
    return this.findOne(userId, saved.id);
  }

  async update(userId: string, id: string, dto: UpdateCalendarEventDto) {
    const e = await this.repo.findOne({ where: { id, userId } });
    if (!e) throw new NotFoundException('Evento del calendario no encontrado');
    const cleanCategoryId = this.clean(dto.categoryId);
    const cleanBudgetId = this.clean(dto.budgetId);
    if (cleanCategoryId && cleanCategoryId !== e.categoryId) await this.checkCategory(userId, cleanCategoryId);
    if (cleanBudgetId) await this.checkBudget(userId, cleanBudgetId);
    const startDate = dto.startDate ?? e.startDate;
    const endDate = dto.endDate ?? e.endDate;
    this.validateEventDates(startDate, endDate);
    Object.assign(e, {
      ...dto,
      ...(cleanCategoryId ? { categoryId: cleanCategoryId } : {}),
      title: dto.title?.trim() || e.title,
      budgetId: cleanBudgetId ?? e.budgetId,
      notes: dto.notes ?? e.notes,
      color: dto.color ?? e.color,
    });
    await this.repo.save(e);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Evento del calendario no encontrado');
  }
}
