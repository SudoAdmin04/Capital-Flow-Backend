import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { rethrowUnique } from '../../common/db-errors';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Screen } from './screen.entity';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';

@Injectable()
export class ScreensService {
  constructor(@InjectRepository(Screen) private readonly repo: Repository<Screen>) {}

  async create(dto: CreateScreenDto) {
    if (dto.parentId) {
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Pantalla padre con ID ${dto.parentId} no encontrada.`);
      }
    }
    try {
      return await this.repo.save(this.repo.create({ ...dto }));
    } catch (e) {
      rethrowUnique(e, 'Ya existe una pantalla con ese nombre.');
    }
  }

  /** Todas las pantallas raíz con sus hijas, sin filtrar por isActive. */
  async findAll() {
    const roots = await this.repo.find({
      where: { parent: IsNull() },
      relations: { children: true, parent: true },
      order: { order: 'ASC', name: 'ASC' },
    });
    return roots.map((s) => ({
      ...s,
      children: [...(s.children ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name),
      ),
    }));
  }

  async findAllPaginated(query: PaginationQueryDto) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const registros = Math.min(100, Math.max(1, Number(query.registros) || 10));
    const buscar = query.buscar?.trim();

    const where: any = {};
    if (buscar) where.name = ILike(`%${buscar}%`);

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { children: true, parent: true },
      order: { order: 'ASC', name: 'ASC' },
      skip: (pagina - 1) * registros,
      take: registros,
    });
    return { data, total };
  }

  async findOne(id: number) {
    const screen = await this.repo.findOne({
      where: { id },
      relations: { children: true, parent: true },
    });
    if (!screen) throw new NotFoundException(`Pantalla con ID ${id} no encontrada.`);
    return screen;
  }

  async update(id: number, dto: UpdateScreenDto) {
    const screen = await this.findOne(id);
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Una pantalla no puede ser padre de sí misma.');
      }
      const parent = await this.repo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Pantalla padre con ID ${dto.parentId} no encontrada.`);
      }
    }
    Object.assign(screen, dto);
    try {
      return await this.repo.save(screen);
    } catch (e) {
      rethrowUnique(e, 'Ya existe una pantalla con ese nombre.');
    }
  }

  async toggleActive(id: number) {
    const screen = await this.findOne(id);
    screen.isActive = !screen.isActive;
    return this.repo.save(screen);
  }

  async remove(id: number) {
    const screen = await this.findOne(id);
    const children = await this.repo.count({ where: { parent: { id } } });
    if (children) {
      throw new BadRequestException('La pantalla tiene hijas; elimínalas o desactívala.');
    }
    await this.repo.remove(screen);
    return { id: screen.id, name: screen.name, path: screen.path };
  }
}
