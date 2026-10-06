import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowUnique } from '../../common/db-errors';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from '../roles/role.entity';
import { Screen } from '../screens/screen.entity';
import { RoleScreen } from './role-screen.entity';
import { CreateRoleScreenDto } from './dto/create-role-screen.dto';
import { UpdateRoleScreenDto } from './dto/update-role-screen.dto';

@Injectable()
export class RoleScreensService {
  constructor(
    @InjectRepository(RoleScreen) private readonly repo: Repository<RoleScreen>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Screen) private readonly screens: Repository<Screen>,
  ) {}

  async create(dto: CreateRoleScreenDto) {
    const role = await this.roles.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException(`Rol con ID ${dto.roleId} no encontrado.`);
    const screen = await this.screens.findOne({ where: { id: dto.screenId } });
    if (!screen) throw new NotFoundException(`Pantalla con ID ${dto.screenId} no encontrada.`);

    const existing = await this.repo.findOne({
      where: { roleId: dto.roleId, screenId: dto.screenId },
    });
    if (existing) {
      throw new ConflictException('La relación entre este rol y esta pantalla ya existe.');
    }
    try {
      const saved = await this.repo.save(this.repo.create({ ...dto }));
      return this.findOne(saved.id);
    } catch (e) {
      rethrowUnique(e, 'La relación entre este rol y esta pantalla ya existe.');
    }
  }

  findAll() {
    return this.repo.find({ relations: { role: true, screen: true } });
  }

  async findAllPaginated(query: PaginationQueryDto) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const registros = Math.min(100, Math.max(1, Number(query.registros) || 10));

    const qb = this.repo
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.role', 'role')
      .leftJoinAndSelect('rs.screen', 'screen')
      .orderBy('screen.order', 'ASC')
      .addOrderBy('screen.name', 'ASC')
      .skip((pagina - 1) * registros)
      .take(registros);

    const buscar = query.buscar?.trim();
    if (buscar) {
      qb.andWhere('(role.name ILIKE :s OR screen.name ILIKE :s)', { s: `%${buscar}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number) {
    const rs = await this.repo.findOne({
      where: { id },
      relations: { role: true, screen: true },
    });
    if (!rs) {
      throw new NotFoundException(`Permiso de rol a pantalla con ID ${id} no encontrado.`);
    }
    return rs;
  }

  async update(id: number, dto: UpdateRoleScreenDto) {
    const rs = await this.findOne(id);
    if (dto.roleId) {
      const role = await this.roles.findOne({ where: { id: dto.roleId } });
      if (!role) throw new NotFoundException(`Rol con ID ${dto.roleId} no encontrado.`);
    }
    if (dto.screenId) {
      const screen = await this.screens.findOne({ where: { id: dto.screenId } });
      if (!screen) throw new NotFoundException(`Pantalla con ID ${dto.screenId} no encontrada.`);
    }
    Object.assign(rs, dto);
    try {
      await this.repo.save(rs);
      return this.findOne(id);
    } catch (e) {
      rethrowUnique(e, 'La relación entre este rol y esta pantalla ya existe.');
    }
  }

  async remove(id: number) {
    const rs = await this.findOne(id);
    await this.repo.remove(rs);
    return { id: rs.id, roleId: rs.roleId, screenId: rs.screenId };
  }
}
