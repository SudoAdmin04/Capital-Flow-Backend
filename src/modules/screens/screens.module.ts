import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from './screen.entity';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';

@Module({
  imports: [TypeOrmModule.forFeature([Screen])],
  controllers: [ScreensController],
  providers: [ScreensService],
  exports: [ScreensService, TypeOrmModule],
})
export class ScreensModule {}
