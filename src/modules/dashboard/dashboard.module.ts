import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '../accounts/accounts.module';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { DebtsModule } from '../debts/debts.module';
import { SavingsGoal } from '../savings-goals/savings-goal.entity';
import { Transaction } from '../transactions/transaction.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Category, Budget, SavingsGoal]), AccountsModule, DebtsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
