import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { rethrowUnique } from '../../common/db-errors';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  /** Incluye passwordHash (excluido por defecto con select:false). */
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findAll() {
    return this.repo.find({
      relations: { role: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(query: PaginationQueryDto) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const registros = Math.min(100, Math.max(1, Number(query.registros) || 10));
    const buscar = query.buscar?.trim();

    const where: any[] | object = buscar
      ? [{ name: ILike(`%${buscar}%`) }, { email: ILike(`%${buscar}%`) }]
      : {};

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { role: true },
      order: { createdAt: 'DESC' },
      skip: (pagina - 1) * registros,
      take: registros,
    });
    return { data, total };
  }

  /** Obtiene un usuario por ID con su rol. Lanza 404 si no existe. */
  async findOne(id: string) {
    const user = await this.repo.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Creación desde el catálogo de usuarios (admin). Hashea el password. */
  async createAdmin(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('El correo ya está registrado');
    if (dto.roleId) await this.requireRole(dto.roleId);

    try {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      const saved = await this.repo.save(
        this.repo.create({
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          currency: dto.currency ?? 'MXN',
          timezone: dto.timezone ?? 'America/Monterrey',
          roleId: dto.roleId ?? null,
        }),
      );
      return this.findOne(saved.id);
    } catch (e) {
      rethrowUnique(e, 'El correo ya está registrado');
    }
  }

  /** Edición completa del usuario (admin). Si viene password lo re-hashea. */
  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está registrado');
      }
    }
    if (dto.roleId) await this.requireRole(dto.roleId);

    const { password, email, ...rest } = dto;
    if (email) user.email = email.toLowerCase();
    Object.assign(user, rest);
    if (password) user.passwordHash = await bcrypt.hash(password, 12);

    try {
      await this.repo.save(user);
      return this.findOne(id);
    } catch (e) {
      rethrowUnique(e, 'El correo ya está registrado');
    }
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    await this.repo.save(user);
    return this.findOne(id);
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    currency?: string;
    timezone?: string;
    roleId?: number | null;
  }) {
    try {
      if (data.roleId) await this.requireRole(data.roleId);
      return await this.repo.save(
        this.repo.create({
          ...data,
          email: data.email.toLowerCase(),
          currency: data.currency ?? 'MXN',
          timezone: data.timezone ?? 'America/Monterrey',
          roleId: data.roleId ?? null,
        }),
      );
    } catch (e) {
      rethrowUnique(e, 'El correo ya está registrado');
    }
  }

  /** Asigna (o retira con null) el rol de un usuario. Solo admin (ver UsersController). */
  async setRole(userId: string, roleId: number | null) {
    const user = await this.findOne(userId);
    if (roleId) await this.requireRole(roleId);
    user.roleId = roleId;
    await this.repo.save(user);
    return this.findOne(userId);
  }

  private async requireRole(roleId: number) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Rol con ID ${roleId} no encontrado.`);
    return role;
  }
}
