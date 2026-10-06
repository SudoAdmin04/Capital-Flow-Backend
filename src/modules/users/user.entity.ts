import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../common/base.entity';
import { Role } from '../roles/role.entity';

@Entity('users')
export class User extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Moneda base (ISO 4217). */
  @Column({ type: 'char', length: 3, default: 'MXN' })
  currency: string;

  @Column({ type: 'varchar', length: 64, default: 'America/Monterrey' })
  timezone: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Rol para RBAC (screens/role-screens). Sus permisos viajan dentro del JWT. */
  @Column({ type: 'int', nullable: true })
  roleId: number | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleId' })
  role: Role | null;
}
