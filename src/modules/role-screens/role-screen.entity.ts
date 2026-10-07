import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { Screen } from '../screens/screen.entity';

@Entity('role_screens')
@Unique(['roleId', 'screenId'])
export class RoleScreen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  roleId: number;

  @ManyToOne(() => Role, (r) => r.roleScreens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'int' })
  screenId: number;

  @ManyToOne(() => Screen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screenId' })
  screen: Screen;

  @Column({ type: 'varchar', length: 80, nullable: true })
  module: string | null;

  @Column({ type: 'boolean', default: false })
  canRead: boolean;

  @Column({ type: 'boolean', default: false })
  canCreate: boolean;

  @Column({ type: 'boolean', default: false })
  canUpdate: boolean;

  @Column({ type: 'boolean', default: false })
  canDelete: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
