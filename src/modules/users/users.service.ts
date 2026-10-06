import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowUnique } from '../../common/db-errors';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /** Alias usado por JwtStrategy / AuthService. */
  findOne(id: string) {
    return this.findById(id);
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
    return this.repo.find({ order: { createdAt: 'DESC' } });
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
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (roleId) await this.requireRole(roleId);
    user.roleId = roleId;
    return this.repo.save(user);
  }

  private async requireRole(roleId: number) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Rol con ID ${roleId} no encontrado.`);
    return role;
  }
}
