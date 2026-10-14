import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { BudgetAdjustment } from './budget-adjustment.entity';
import { Budget } from './budget.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { BudgetCalendarModule } from './calendar/budget-calendar.module';
import { BudgetCalendarController } from './calendar/budget-calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, BudgetAdjustment, Category, Transaction]),
    BudgetCalendarModule,
  ],
  // Orden intencional: la ruta estática `/budgets/calendar` debe registrarse
  // ANTES que `/budgets/:id` para que Express no la capture como `id='calendar'`.
  controllers: [BudgetCalendarController, BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
