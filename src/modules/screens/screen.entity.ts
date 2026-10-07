import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from 'typeorm'; 

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  /**
   * Módulo o grupo lógico al que pertenece la pantalla
   * (ej: 'finanzas', 'sistema', 'catalogos').
   * Sirve para agrupar páginas de diferentes módulos en el menú.
   * La jerarquía padre/hija se define con `parentId`, no con este campo.
   */
  @Index()
  @Column({ type: 'varchar', length: 80, nullable: true })
  module: string | null;

  @ManyToOne(() => Screen, (s) => s.children, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentId' })
  parent: Screen | null;

  @RelationId((s: Screen) => s.parent)
  parentId: number | null;

  @OneToMany(() => Screen, (s) => s.parent)
  children: Screen[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
