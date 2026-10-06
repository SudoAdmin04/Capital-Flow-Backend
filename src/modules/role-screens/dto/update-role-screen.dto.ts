import { PartialType } from '@nestjs/swagger';
import { CreateRoleScreenDto } from './create-role-screen.dto';

export class UpdateRoleScreenDto extends PartialType(CreateRoleScreenDto) {}
