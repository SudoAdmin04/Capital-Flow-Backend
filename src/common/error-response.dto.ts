import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validación fallida' })
  message: string | string[];

  @ApiProperty({ example: '/api/accounts', required: false })
  path?: string;

  @ApiProperty({ example: '2025-10-06T12:00:00.000Z', required: false })
  timestamp?: string;
}
