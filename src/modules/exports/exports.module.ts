import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [DashboardModule, TransactionsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
