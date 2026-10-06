import { IsInt, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleScreenDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El ID del rol debe ser un número entero' })
  roleId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El ID de la pantalla debe ser un número entero' })
  screenId: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'canRead debe ser un valor booleano' })
  canRead?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'canCreate debe ser un valor booleano' })
  canCreate?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'canUpdate debe ser un valor booleano' })
  canUpdate?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'canDelete debe ser un valor booleano' })
  canDelete?: boolean;
}
