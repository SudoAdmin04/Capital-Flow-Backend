import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/role.entity';
import { Screen } from '../screens/screen.entity';
import { RoleScreensController } from './role-screens.controller';
import { RoleScreen } from './role-screen.entity';
import { RoleScreensService } from './role-screens.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleScreen, Role, Screen])],
  controllers: [RoleScreensController],
  providers: [RoleScreensService],
  exports: [RoleScreensService],
})
export class RoleScreensModule {}
