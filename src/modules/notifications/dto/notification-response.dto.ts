import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../common/enums';

export class NotificationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'Presupuesto excedido' })
  title: string;

  @ApiProperty({
    example: 'Has superado el 80% de tu presupuesto en Alimentación.',
  })
  body: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.WARNING })
  type: NotificationType;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-03-30T00:00:00.000Z' })
  createdAt: Date;
}
