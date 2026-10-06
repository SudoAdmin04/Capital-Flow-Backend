import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { CategoryKind } from '../../common/enums';

/**
 * Arbol de dos niveles:
 *   rubro   (parentId = null)  -> Sueldo, Gastos, Servicios, Ahorro, Deudas...
 *   partida (parentId = rubro) -> Renta departamento, Internet, Taxi...
 */
@Entity('categories')
@Index(['userId', 'parentId', 'name'], { unique: true })
export class Category extends OwnedEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'enum', enum: CategoryKind, enumName: 'category_kind' })
  kind: CategoryKind;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (c) => c.children, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentId' })
  parent: Category | null;

  @OneToMany(() => Category, (c) => c.parent)
  children: Category[];

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  /** Nombre de icono (Material Symbols), ej. "wifi", "shopping_cart". */
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
