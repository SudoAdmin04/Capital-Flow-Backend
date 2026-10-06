import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { Account } from '../accounts/account.entity';
import { Budget } from '../budgets/budget.entity';
import { Category } from '../categories/category.entity';
import { Debt } from '../debts/debt.entity';
import { Notification } from '../notifications/notification.entity';
import { Role } from '../roles/role.entity';
import { RoleScreen } from '../role-screens/role-screen.entity';
import { SavingsGoal } from '../savings-goals/savings-goal.entity';
import { Screen } from '../screens/screen.entity';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Screen,
      RoleScreen,
      User,
      Account,
      Category,
      Debt,
      Transaction,
      Budget,
      SavingsGoal,
      Notification,
    ]),
  ],
})
export class SeedModule {}
