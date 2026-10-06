import { Column, Entity, Index, OneToMany } from 'typeorm';
import { OwnedEntity } from '../../common/owned.entity';
import { AccountType } from '../../common/enums';
import { decimalTransformer } from '../../common/decimal.transformer';
import { Transaction } from '../transactions/transaction.entity';

@Entity('accounts')
@Index(['userId', 'name'], { unique: true })
export class Account extends OwnedEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'enum', enum: AccountType, enumName: 'account_type' })
  type: AccountType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  institution: string | null;

  /** Ultimos 4 digitos (nunca guardar numero completo de tarjeta/cuenta). */
  @Column({ type: 'char', length: 4, nullable: true })
  last4: string | null;

  @Column({ type: 'char', length: 3, default: 'MXN' })
  currency: string;

  /** Saldo al empezar a usar el sistema. El saldo actual se calcula con los movimientos. */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  initialBalance: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  creditLimit: number | null;

  /** Cuenta preseleccionada en el header ("Cuenta Principal"). */
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Transaction, (t) => t.account)
  transactions: Transaction[];
}
