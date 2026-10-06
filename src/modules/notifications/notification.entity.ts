import { Column, Entity } from 'typeorm';
import { NotificationType } from '../../common/enums';
import { OwnedEntity } from '../../common/owned.entity';

@Entity('notifications')
export class Notification extends OwnedEntity {
  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationType, enumName: 'notification_type', default: NotificationType.INFO })
  type: NotificationType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;
}
