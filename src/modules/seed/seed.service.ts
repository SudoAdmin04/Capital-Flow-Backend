import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CategoryKind, TransactionStatus, TransactionType } from '../../common/enums';
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
import {
  cuentas,
  categorias,
  deudas,
  metasAhorro,
  notificaciones,
  permisos,
  presupuestos,
  roles,
  screens,
  transacciones,
  usuarios,
} from './data/inicio';

/**
 * Seed idempotente del ambiente de prueba.
 *
 * Orden (respeta FKs y reglas de negocio):
 * 1. roles (por name) -> 2. screens (por name, padres primero vía parentRef)
 * 3. users (por email, bcrypt 12, rolRef) -> 4. role_screens (por rol+pantalla)
 * 5. accounts (por usuario+nombre) -> 6. categories (por usuario+padre+nombre)
 * 7. debts -> 8. transactions (se omiten si el usuario ya tiene)
 * 9. budgets -> 10. savings_goals -> 11. notifications
 *
 * No hace TRUNCATE: es re-ejecutable y no borra datos existentes.
 * Las finanzas de ejemplo quedan ligadas al primer usuario (superAdmin).
 */
@Injectable()
export class SeedService {
  constructor(private readonly dataSource: DataSource) {}

  async executeSeed() {
    const summary = await this.insertSeed();
    return { message: 'Semilla creada', ...summary };
  }

  private async insertSeed() {
    const roleRepo = this.dataSource.getRepository(Role);
    const screenRepo = this.dataSource.getRepository(Screen);
    const roleScreenRepo = this.dataSource.getRepository(RoleScreen);
    const userRepo = this.dataSource.getRepository(User);
    const accountRepo = this.dataSource.getRepository(Account);
    const categoryRepo = this.dataSource.getRepository(Category);
    const debtRepo = this.dataSource.getRepository(Debt);
    const txRepo = this.dataSource.getRepository(Transaction);
    const budgetRepo = this.dataSource.getRepository(Budget);
    const goalRepo = this.dataSource.getRepository(SavingsGoal);
    const notifRepo = this.dataSource.getRepository(Notification);

    const created = {
      roles: 0,
      screens: 0,
      users: 0,
      permissions: 0,
      accounts: 0,
      categories: 0,
      debts: 0,
      transactions: 0,
      budgets: 0,
      goals: 0,
      notifications: 0,
    };

    // ---- 1. Roles (por name) ----
    const roleIdByRef: Record<number, number> = {};
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      let role = await roleRepo.findOne({ where: { name: r.name } });
      if (!role) {
        role = await roleRepo.save(
          roleRepo.create({
            name: r.name,
            description: r.description ?? null,
            isAdmin: r.isAdmin ?? false,
            isActive: r.isActive ?? true,
          }),
        );
        created.roles++;
      }
      roleIdByRef[i + 1] = role.id;
    }

    // ---- 2. Screens (por name; padres antes que hijas) ----
    const screenIdByRef: Record<number, number> = {};
    for (let i = 0; i < screens.length; i++) {
      const s = screens[i];
      if (s.parentRef && !screenIdByRef[s.parentRef]) {
        throw new Error(`parentRef inválido ${s.parentRef} para pantalla '${s.name}': el padre debe ir antes en el arreglo`);
      }
      let screen = await screenRepo.findOne({ where: { name: s.name } });
      if (!screen) {
        screen = await screenRepo.save(
          screenRepo.create({
            name: s.name,
            path: s.path ?? null,
            icon: s.icon ?? null,
            order: s.order ?? 0,
            module: s.module ?? null,
            parentId: s.parentRef ? screenIdByRef[s.parentRef] : null,
            isActive: s.isActive ?? true,
          }),
        );
        created.screens++;
      } else if (s.parentRef || s.module) {
        // Mantiene module/parentId alineados si la plantilla cambia.
        const parentId = s.parentRef ? screenIdByRef[s.parentRef] : screen.parentId;
        if (screen.module !== (s.module ?? null) || screen.parentId !== parentId) {
          screen.module = s.module ?? null;
          screen.parentId = parentId;
          await screenRepo.save(screen);
        }
      }
      screenIdByRef[i + 1] = screen.id;
    }

    // ---- 3. Usuarios (por email) ----
    const userIdByRef: Record<number, string> = {};
    for (let i = 0; i < usuarios.length; i++) {
      const u = usuarios[i];
      const roleId = roleIdByRef[u.rolRef];
      if (!roleId) throw new Error(`rolRef inválido ${u.rolRef} para '${u.email}'`);
      const email = u.email.toLowerCase();
      let user = await userRepo.findOne({ where: { email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            email,
            passwordHash: await bcrypt.hash(u.password, 12),
            name: u.name,
            currency: u.currency ?? 'MXN',
            timezone: u.timezone ?? 'America/Monterrey',
            isActive: true,
            roleId,
          }),
        );
        created.users++;
      } else if (user.roleId !== roleId) {
        user.roleId = roleId;
        await userRepo.save(user);
      }
      userIdByRef[i + 1] = user.id;
    }

    // ---- 4. Permisos rol-pantalla ----
    for (const entry of permisos) {
      const roleId = roleIdByRef[entry.rolRef];
      if (!roleId) throw new Error(`rolRef inválido ${entry.rolRef} en permisos`);
      for (const p of entry.pantallas) {
        const screenId = screenIdByRef[p.pantallaRef];
        if (!screenId) throw new Error(`pantallaRef inválida ${p.pantallaRef}`);
        const existing = await roleScreenRepo.findOne({ where: { roleId, screenId } });
        if (!existing) {
          await roleScreenRepo.save(
            roleScreenRepo.create({
              roleId,
              screenId,
              canRead: p.canRead,
              canCreate: p.canCreate,
              canUpdate: p.canUpdate,
              canDelete: p.canDelete,
            }),
          );
          created.permissions++;
        }
      }
    }

    // ---- 5. Cuentas (por usuario + nombre) ----
    const accountIdByRef: Record<number, string> = {};
    for (let i = 0; i < cuentas.length; i++) {
      const c = cuentas[i];
      const userId = userIdByRef[c.usuarioRef];
      if (!userId) throw new Error(`usuarioRef inválido ${c.usuarioRef} en cuenta '${c.name}'`);
      let account = await accountRepo.findOne({ where: { userId, name: c.name } });
      if (!account) {
        if (c.isPrimary) await accountRepo.update({ userId }, { isPrimary: false });
        account = await accountRepo.save(
          accountRepo.create({
            userId,
            name: c.name,
            type: c.type,
            institution: c.institution ?? null,
            last4: c.last4 ?? null,
            currency: c.currency ?? 'MXN',
            initialBalance: c.initialBalance ?? 0,
            creditLimit: c.creditLimit ?? null,
            isPrimary: c.isPrimary ?? false,
            isActive: true,
          }),
        );
        created.accounts++;
      }
      accountIdByRef[i + 1] = account.id;
    }

    // ---- 6. Categorías (rubros primero; partidas con parentRef) ----
    const categoryIdByRef: Record<number, string> = {};
    for (let i = 0; i < categorias.length; i++) {
      const c = categorias[i];
      const userId = userIdByRef[c.usuarioRef];
      if (!userId) throw new Error(`usuarioRef inválido ${c.usuarioRef} en categoría '${c.name}'`);
      if (c.parentRef && !categoryIdByRef[c.parentRef]) {
        throw new Error(`parentRef inválido ${c.parentRef} para categoría '${c.name}'`);
      }
      const parentId = c.parentRef ? categoryIdByRef[c.parentRef] : null;
      let category: Category | null;
      if (parentId) {
        category = await categoryRepo.findOne({ where: { userId, parentId, name: c.name } });
      } else {
        category = await categoryRepo.findOne({ where: { userId, parentId: IsNull(), name: c.name } });
      }
      if (!category) {
        category = await categoryRepo.save(
          categoryRepo.create({
            userId,
            name: c.name,
            kind: c.kind,
            parentId,
            icon: c.icon ?? null,
            color: c.color ?? null,
            sortOrder: c.sortOrder ?? i,
            isActive: true,
          }),
        );
        created.categories++;
      }
      categoryIdByRef[i + 1] = category.id;
    }

    // ---- 7. Deudas ----
    const debtIdByRef: Record<number, string> = {};
    for (let i = 0; i < deudas.length; i++) {
      const d = deudas[i];
      const userId = userIdByRef[d.usuarioRef];
      if (!userId) throw new Error(`usuarioRef inválido ${d.usuarioRef} en deuda '${d.name}'`);
      let debt = await debtRepo.findOne({ where: { userId, name: d.name } });
      if (!debt) {
        debt = await debtRepo.save(
          debtRepo.create({
            userId,
            name: d.name,
            counterparty: d.counterparty ?? null,
            reference: d.reference ?? null,
            direction: d.direction,
            principalAmount: d.principalAmount,
            status: 'open' as never,
            dueDate: d.dueDate ?? null,
            notes: d.notes ?? null,
          }),
        );
        created.debts++;
      }
      debtIdByRef[i + 1] = debt.id;
    }

    // ---- 8. Transacciones (se omiten si el usuario ya tiene; valida reglas) ----
    const ownerId = userIdByRef[1];
    const ownerTxCount = await txRepo.count({ where: { userId: ownerId } });
    if (ownerTxCount === 0) {
      const catKindById = new Map<string, CategoryKind>();
      for (const id of Object.values(categoryIdByRef)) {
        const cat = await categoryRepo.findOne({ where: { id } });
        if (cat) catKindById.set(id, cat.kind);
      }
      for (const t of transacciones) {
        const userId = userIdByRef[t.usuarioRef];
        const accountId = accountIdByRef[t.cuentaRef];
        if (!userId || !accountId) {
          throw new Error(`Referencia inválida en transacción '${t.concept}'`);
        }
        const categoryId = t.categoriaRef ? categoryIdByRef[t.categoriaRef] : null;
        const destinationAccountId = t.destinoRef ? accountIdByRef[t.destinoRef] : null;
        const debtId = t.deudaRef ? debtIdByRef[t.deudaRef] : null;
        // Reglas: transfer sin categoría y con destino distinto; income↔kind income; expense↔kind no-income.
        if (t.type === TransactionType.TRANSFER) {
          if (!destinationAccountId) throw new Error(`Transferencia '${t.concept}' requiere destinoRef`);
          if (destinationAccountId === accountId) throw new Error(`Transferencia '${t.concept}' origen = destino`);
          if (categoryId) throw new Error(`Transferencia '${t.concept}' no lleva categoría`);
        } else {
          if (destinationAccountId) throw new Error(`'${t.concept}' solo transfer lleva destino`);
          if (!categoryId) throw new Error(`'${t.concept}' requiere categoriaRef`);
          const kind = catKindById.get(categoryId);
          const isIncome = kind === CategoryKind.INCOME;
          if (t.type === TransactionType.INCOME ? !isIncome : isIncome) {
            throw new Error(`Categoría no corresponde al tipo en '${t.concept}'`);
          }
        }
        const status = t.status ?? TransactionStatus.PENDING;
        await txRepo.save(
          txRepo.create({
            userId,
            accountId,
            destinationAccountId,
            categoryId,
            debtId,
            type: t.type,
            amount: t.amount,
            date: t.date,
            concept: t.concept,
            description: t.description ?? null,
            paymentMethod: t.paymentMethod ?? null,
            status,
            reconciledAt: status === TransactionStatus.RECONCILED ? new Date() : null,
            reference: t.reference ?? null,
          }),
        );
        created.transactions++;
      }
    } else {
      console.log(`El usuario ya tiene ${ownerTxCount} movimientos; se omiten transacciones demo`);
    }

    // ---- 9. Presupuestos (por usuario+categoría+año+mes) ----
    for (const b of presupuestos) {
      const userId = userIdByRef[b.usuarioRef];
      const categoryId = categoryIdByRef[b.categoriaRef];
      if (!userId || !categoryId) throw new Error('Referencia inválida en presupuestos');
      const existing = await budgetRepo.findOne({ where: { userId, categoryId, year: b.year, month: b.month } });
      if (!existing) {
        await budgetRepo.save(budgetRepo.create({ userId, categoryId, year: b.year, month: b.month, amount: b.amount }));
        created.budgets++;
      }
    }

    // ---- 10. Metas de ahorro (por usuario+nombre) ----
    for (const g of metasAhorro) {
      const userId = userIdByRef[g.usuarioRef];
      if (!userId) throw new Error(`usuarioRef inválido en meta '${g.name}'`);
      const existing = await goalRepo.findOne({ where: { userId, name: g.name } });
      if (!existing) {
        await goalRepo.save(
          goalRepo.create({
            userId,
            name: g.name,
            monthlyContribution: g.monthlyContribution,
            targetAmount: g.targetAmount ?? null,
            accountId: g.cuentaRef ? accountIdByRef[g.cuentaRef] : null,
            categoryId: g.categoriaRef ? categoryIdByRef[g.categoriaRef] : null,
            isActive: true,
          }),
        );
        created.goals++;
      }
    }

    // ---- 11. Notificaciones (por usuario+título) ----
    for (const n of notificaciones) {
      const userId = userIdByRef[n.usuarioRef];
      if (!userId) throw new Error(`usuarioRef inválido en notificación '${n.title}'`);
      const existing = await notifRepo.findOne({ where: { userId, title: n.title } });
      if (!existing) {
        await notifRepo.save(
          notifRepo.create({ userId, title: n.title, body: n.body, type: n.type ?? ('info' as never), isRead: false }),
        );
        created.notifications++;
      }
    }

    console.log('Seed completado:', created);
    return created;
  }
}
