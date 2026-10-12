import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { BudgetAdjustment } from './budget-adjustment.entity';
import { Budget } from './budget.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, BudgetAdjustment, Category, Transaction])],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
