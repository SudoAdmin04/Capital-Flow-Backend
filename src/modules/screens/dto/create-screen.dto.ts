import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScreenDto {
  @ApiProperty({ example: 'Dashboard' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name: string;

  @ApiPropertyOptional({ example: '/dashboard' })
  @IsOptional()
  @IsString({ message: 'La ruta debe ser una cadena de texto' })
  path?: string;

  @ApiPropertyOptional({ example: 'layout-dashboard' })
  @IsOptional()
  @IsString({ message: 'El icono debe ser una cadena de texto' })
  icon?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({
    message: 'El orden debe ser un número entero',
  })
  order?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({
    message: 'El ID de la pantalla padre debe ser un número entero',
  })
  parentId?: number;

  @ApiPropertyOptional({
    example: 'finanzas',
    description:
      'Módulo o grupo lógico para agrupar pantallas (ej: finanzas, sistema, catalogos). La jerarquía padre/hija se define con parentId.',
  })
  @IsOptional()
  @IsString({ message: 'El módulo debe ser una cadena de texto' })
  module?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  isActive?: boolean;
}
