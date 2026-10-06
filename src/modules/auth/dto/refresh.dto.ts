import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'El refresh_token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El refresh_token no puede estar vacío' })
  refresh_token: string;
}
