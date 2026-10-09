import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { SavingsGoal } from './savings-goal.entity';
import { SavingsGoalEntry } from './savings-goal-entry.entity';
import { SavingsGoalsController } from './savings-goals.controller';
import { SavingsGoalsService } from './savings-goals.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavingsGoal, SavingsGoalEntry, Account, Category, Transaction])],
  controllers: [SavingsGoalsController],
  providers: [SavingsGoalsService],
  exports: [SavingsGoalsService],
})
export class SavingsGoalsModule {}
