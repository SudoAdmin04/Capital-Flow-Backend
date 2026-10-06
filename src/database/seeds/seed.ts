import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { AccountType, DebtDirection, PaymentMethod, TransactionStatus, TransactionType } from '../../common/enums';
import { AccountsService } from '../../modules/accounts/accounts.service';
import { AuthService } from '../../modules/auth/auth.service';
import { Account } from '../../modules/accounts/account.entity';
import { Budget } from '../../modules/budgets/budget.entity';
import { Category } from '../../modules/categories/category.entity';
import { Debt } from '../../modules/debts/debt.entity';
import { Role } from '../../modules/roles/role.entity';
import { SavingsGoal } from '../../modules/savings-goals/savings-goal.entity';
import { Transaction } from '../../modules/transactions/transaction.entity';
import { UsersService } from '../../modules/users/users.service';

/**
 * Crea el usuario inicial (con el catálogo de categorías del Excel) y,
 * si SEED_DEMO_DATA=true, carga los datos de octubre 2025 de la hoja original
 * para validar que el dashboard cuadre: ingresos 20,100 / egresos 26,619 / neto -6,519.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const users = app.get(UsersService);
  const auth = app.get(AuthService);
  const accountsService = app.get(AccountsService);

  const email = process.env.SEED_USER_EMAIL ?? 'alan@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'CambiaEstaClave123!';
  const name = process.env.SEED_USER_NAME ?? 'Alan';

  let user = await users.findByEmail(email);
  if (!user) {
    await auth.register({ email, password, name });
    user = (await users.findByEmail(email))!;
    console.log(`Usuario creado: ${email}`);
  } else {
    console.log(`Usuario existente: ${email}`);
  }

  // Roles base RBAC (el JWT embebe las pantallas del rol). El seed queda como administrador.
  const roleRepo = ds.getRepository(Role);
  let adminRole = await roleRepo.findOne({ where: { name: 'Administrador' } });
  if (!adminRole) {
    adminRole = await roleRepo.save(
      roleRepo.create({ name: 'Administrador', description: 'Acceso total al sistema', isAdmin: true }),
    );
    console.log('Rol creado: Administrador');
  }
  let userRole = await roleRepo.findOne({ where: { name: 'Usuario' } });
  if (!userRole) {
    userRole = await roleRepo.save(
      roleRepo.create({ name: 'Usuario', description: 'Rol base de finanzas personales', isAdmin: false }),
    );
    console.log('Rol creado: Usuario');
  }
  if (user.roleId !== adminRole.id) {
    await users.setRole(user.id, adminRole.id);
    console.log(`Rol Administrador asignado a: ${email}`);
  }
  const userId = user.id;

  const accRepo = ds.getRepository(Account);
  if (!(await accRepo.count({ where: { userId } }))) {
    // Con datos demo, los saldos iniciales hacen que los saldos finales coincidan con la pantalla
    // "Cuentas" del diseño (12,450 / 5,200 / 3,180 = 20,830). Sin demo, empiezan en 0.
    const demo = process.env.SEED_DEMO_DATA === 'true';
    await accountsService.create(userId, { name: 'Cuenta Principal', type: AccountType.CHECKING, institution: 'Banco Principal', isPrimary: true, initialBalance: demo ? 18479 : 0 });
    await accountsService.create(userId, { name: 'Reserva / Ahorro', type: AccountType.SAVINGS, institution: 'Banco Principal', initialBalance: demo ? 5200 : 0 });
    await accountsService.create(userId, { name: 'Efectivo / Caja', type: AccountType.CASH, initialBalance: demo ? 3670 : 0 });
    console.log('Cuentas base creadas');
  }

  if (process.env.SEED_DEMO_DATA === 'true') {
    const txRepo = ds.getRepository(Transaction);
    if (await txRepo.count({ where: { userId } })) {
      console.log('Ya hay movimientos; se omiten los datos demo');
    } else {
      const cats = await ds.getRepository(Category).find({ where: { userId } });
      const cat = (n: string) => cats.find((c) => c.name === n)!.id;
      const accs = await accRepo.find({ where: { userId } });
      const acc = (n: string) => accs.find((a) => a.name === n)!.id;
      const main = acc('Cuenta Principal');
      const cash = acc('Efectivo / Caja');

      // OJO: en el Excel "Dinero prestado" es un egreso de $3,000. Aqui se modela como dinero que
      // PRESTASTE (cuenta por cobrar). Si en realidad es una deuda tuya, cambia direction a PAYABLE
      // y registra los abonos como transacciones con debtId.
      await ds.getRepository(Debt).save(
        ds.getRepository(Debt).create({ userId, name: 'Dinero prestado', reference: '#D892', direction: DebtDirection.RECEIVABLE, principalAmount: 3000, dueDate: '2025-11-15' }),
      );

      const T = TransactionType;
      const P = PaymentMethod;
      const R = TransactionStatus.RECONCILED;
      const rows: Array<[string, string, number, TransactionType, string, PaymentMethod, string, TransactionStatus?, string?]> = [
        // fecha, concepto, monto, tipo, categoria, metodo, cuenta, estado, debtId
        ['2025-10-28', 'Renta departamento', 6700, T.EXPENSE, 'Renta departamento', P.BANK_TRANSFER, main],
        ['2025-10-25', 'Sueldo quincenal', 5800, T.INCOME, 'Sueldo', P.BANK_TRANSFER, main],
        ['2025-10-24', 'Dinero prestado', 3000, T.EXPENSE, 'Dinero prestado', P.BANK_TRANSFER, main, TransactionStatus.PENDING],
        ['2025-10-20', 'Consultoría y rendimientos', 9300, T.INCOME, 'Otros', P.BANK_TRANSFER, main],
        ['2025-10-18', 'Supermercado y provisiones', 15144, T.EXPENSE, 'Gastos', P.DEBIT_CARD, main],
        ['2025-10-15', 'Mesada familiar', 5000, T.INCOME, 'Mesada', P.BANK_TRANSFER, main],
        ['2025-10-12', 'Internet fibra óptica', 635, T.EXPENSE, 'Internet', P.DEBIT_CARD, main],
        ['2025-10-10', 'Ahorro semanal', 500, T.EXPENSE, 'Ahorro semanal', P.BANK_TRANSFER, main],
        ['2025-10-08', 'Lavandería', 430, T.EXPENSE, 'Lavandería', P.CASH, cash],
        ['2025-10-05', 'Datos celulares', 150, T.EXPENSE, 'Datos celulares', P.DEBIT_CARD, main],
        ['2025-10-02', 'Taxi', 60, T.EXPENSE, 'Taxi', P.CASH, cash],
      ];
      await txRepo.save(
        rows.map(([date, concept, amount, type, category, pm, accountId, status, debtId]) =>
          txRepo.create({
            userId, date, concept, amount, type, categoryId: cat(category), paymentMethod: pm, accountId,
            status: status ?? R, reconciledAt: (status ?? R) === R ? new Date() : null, debtId: debtId ?? null,
          }),
        ),
      );

      const budgets: Array<[string, number]> = [
        ['Sueldo', 6000], ['Otros', 9200], ['Mesada', 5000],
        ['Gastos', 13811], ['Ahorro semanal', 500],
        ['Renta departamento', 6700], ['Lavandería', 550], ['Internet', 500], ['Datos celulares', 150], ['Taxi', 120],
      ];
      await ds.getRepository(Budget).save(
        budgets.map(([c, amount]) => ds.getRepository(Budget).create({ userId, categoryId: cat(c), year: 2025, month: 10, amount })),
      );

      await ds.getRepository(SavingsGoal).save(
        ds.getRepository(SavingsGoal).create({
          userId, name: 'Ahorro semanal', monthlyContribution: 500,
          accountId: acc('Reserva / Ahorro'), categoryId: cat('Ahorro semanal'),
        }),
      );
      console.log('Datos demo de octubre 2025 cargados');
    }
  }

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
