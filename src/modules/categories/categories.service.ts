import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowUnique } from '../../common/db-errors';
import { Transaction } from '../transactions/transaction.entity';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { DEFAULT_CATEGORIES } from './default-categories';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  /** Crea el catálogo base del Excel para un usuario nuevo. */
  async seedDefaults(userId: string) {
    let order = 0;
    for (const def of DEFAULT_CATEGORIES) {
      const root = await this.repo.save(
        this.repo.create({
          userId,
          name: def.name,
          kind: def.kind,
          icon: def.icon,
          color: def.color,
          sortOrder: order++,
        }),
      );
      if (def.children?.length) {
        await this.repo.save(
          def.children.map((c, i) =>
            this.repo.create({
              userId,
              name: c.name,
              kind: def.kind,
              icon: c.icon,
              color: def.color,
              parentId: root.id,
              sortOrder: i,
            }),
          ),
        );
      }
    }
  }

  findAll(userId: string) {
    return this.repo.find({ where: { userId }, order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /** Rubros con sus partidas anidadas. */
  async findTree(userId: string) {
    const all = await this.findAll(userId);
    const roots = all.filter((c) => !c.parentId);
    return roots.map((r) => ({ ...r, children: all.filter((c) => c.parentId === r.id) }));
  }

  async findOne(userId: string, id: string) {
    const category = await this.repo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    let kind = dto.kind;
    if (dto.parentId) {
      const parent = await this.findOne(userId, dto.parentId);
      if (parent.parentId) throw new BadRequestException('Solo se permiten dos niveles (rubro > partida)');
      kind = parent.kind;
    }
    if (!kind) throw new BadRequestException('kind es obligatorio para un rubro');
    try {
      return await this.repo.save(this.repo.create({ ...dto, kind, userId, parentId: dto.parentId ?? null }));
    } catch (e) {
      rethrowUnique(e, 'Ya existe una categoría con ese nombre en ese nivel');
    }
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, id);
    Object.assign(category, dto);
    try {
      return await this.repo.save(category);
    } catch (e) {
      rethrowUnique(e, 'Ya existe una categoría con ese nombre en ese nivel');
    }
  }

  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);
    const children = await this.repo.count({ where: { userId, parentId: id } });
    if (children) throw new ConflictException('El rubro tiene partidas; elimínalas o desactívalo');
    const used = await this.txRepo.count({ where: { userId, categoryId: id } });
    if (used) throw new ConflictException('La categoría tiene movimientos; desactívala en lugar de eliminarla');
    await this.repo.remove(category);
  }
}
