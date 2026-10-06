import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../../common/enums';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Presupuesto excedido' })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título no puede estar vacío' })
  title: string;

  @ApiProperty({
    example: 'Has superado el 80% de tu presupuesto en Alimentación.',
  })
  @IsString({ message: 'El cuerpo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El cuerpo no puede estar vacío' })
  body: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.WARNING })
  @IsEnum(NotificationType, { message: 'Tipo de notificación inválido' })
  @IsNotEmpty({ message: 'El tipo de notificación es obligatorio' })
  type: NotificationType;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
