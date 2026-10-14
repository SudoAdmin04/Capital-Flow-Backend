import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../categories/category.entity';
import { Budget } from '../budget.entity';
import { BudgetCalendarEvent } from './budget-calendar-event.entity';
import { BudgetCalendarService } from './budget-calendar.service';

/**
 * Submódulo aparte del calendario (rutas `/budgets/calendar`). Se importa en `BudgetsModule`.
 * NOTA: el controller se registra en `BudgetsModule.controllers` (ANTES que `BudgetsController`)
 * para que Express matchee `/budgets/calendar` antes que `/budgets/:id` (`:id = 'calendar'`
 * rompía con `ParseUUIDPipe`). No declararlo aquí evita doble registro de rutas.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BudgetCalendarEvent, Category, Budget])],
  controllers: [],
  providers: [BudgetCalendarService],
  exports: [BudgetCalendarService],
})
export class BudgetCalendarModule {}
