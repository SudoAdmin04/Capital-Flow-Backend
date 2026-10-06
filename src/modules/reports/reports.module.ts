import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { DebtsModule } from '../debts/debts.module';
import { Transaction } from '../transactions/transaction.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Category, Budget]), AccountsModule, DebtsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
