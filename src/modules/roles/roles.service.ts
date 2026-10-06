import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { rethrowUnique } from '../../common/db-errors';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from './role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private readonly repo: Repository<Role>) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Ya existe un rol con ese nombre.');
    try {
      const saved = await this.repo.save(this.repo.create({ ...dto }));
      return this.findOne(saved.id);
    } catch (e) {
      rethrowUnique(e, 'Ya existe un rol con ese nombre.');
    }
  }

  findAll() {
    return this.repo.find({ relations: { roleScreens: { screen: true } } });
  }

  async findAllPaginated(query: PaginationQueryDto) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const registros = Math.min(100, Math.max(1, Number(query.registros) || 10));
    const buscar = query.buscar?.trim();

    const where: any = {};
    if (buscar) where.name = ILike(`%${buscar}%`);

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { roleScreens: { screen: true } },
      order: { createdAt: 'DESC' },
      skip: (pagina - 1) * registros,
      take: registros,
    });
    return { data, total };
  }

  async findOne(id: number) {
    const role = await this.repo.findOne({
      where: { id },
      relations: { roleScreens: { screen: true } },
    });
    if (!role) throw new NotFoundException(`Rol con ID ${id} no encontrado.`);
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (dto.name) {
      const existing = await this.repo.findOne({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe otro rol con ese nombre.');
      }
    }
    Object.assign(role, dto);
    try {
      await this.repo.save(role);
      return this.findOne(id);
    } catch (e) {
      rethrowUnique(e, 'Ya existe otro rol con ese nombre.');
    }
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    await this.repo.remove(role);
    return { id };
  }
}
