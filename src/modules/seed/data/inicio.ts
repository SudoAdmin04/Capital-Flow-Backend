import {
  AccountType,
  AdjustmentSource,
  CategoryKind,
  DebtDirection,
  DebtStatus,
  NotificationType,
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '../../../common/enums';

export interface SeedRole {
  name: string;
  description?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface SeedScreen {
  name: string;
  path?: string;
  icon?: string;
  order?: number;
  module?: string;
  parentRef?: number;
  isActive?: boolean;
}

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  currency?: string;
  timezone?: string;
  rolRef: number;
}

export interface SeedRoleScreen {
  pantallaRef: number;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface SeedRolePermisos {
  rolRef: number;
  pantallas: SeedRoleScreen[];
}

export const roles: SeedRole[] = [
  {
    name: 'Super Administrador',
    description: 'Desarrollador del proyecto. Acceso total, incluyendo RBAC.',
    isAdmin: true,
    isActive: true,
  },
  {
    name: 'Administrador General',
    description: 'Administración operativa del sistema.',
    isAdmin: true,
    isActive: true,
  },
];


export const screens: SeedScreen[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'i-lucide-layout-dashboard',
    order: 10,
    module: 'finanzas',
  },
  {
    name: 'Transacciones',
    path: '/transacciones',
    icon: 'i-lucide-arrow-left-right',
    order: 20,
    module: 'finanzas',
  },
  {
    name: 'Presupuestos',
    path: '/presupuestos',
    icon: 'i-lucide-wallet',
    order: 30,
    module: 'finanzas',
  },
  {
    name: 'Reportes',
    path: '/reportes',
    icon: 'i-lucide-files',
    order: 40,
    module: 'finanzas',
  },
  {
    name: 'Cuentas',
    path: '/cuentas',
    icon: 'i-lucide-landmark',
    order: 50,
    module: 'finanzas',
  },

  {
    name: 'Configuración',
    path: '/configuracion',
    icon: 'i-lucide-settings',
    order: 200,
    module: 'sistema',
  },
  {
    name: 'Usuarios',
    path: '/configuracion/usuarios',
    icon: 'i-lucide-users',
    order: 210,
    module: 'sistema',
    parentRef: 6,
  },
  {
    name: 'Roles',
    path: '/configuracion/roles',
    icon: 'i-lucide-user-shield',
    order: 220,
    module: 'sistema',
    parentRef: 6,
  },
  {
    name: 'Pantallas',
    path: '/configuracion/pantallas',
    icon: 'i-lucide-monitor',
    order: 230,
    module: 'sistema',
    parentRef: 6,
  },
  {
    name: 'Permisos',
    path: '/configuracion/permisos',
    icon: 'i-lucide-shield-user',
    order: 240,
    module: 'sistema',
    parentRef: 6,
  },

  {
    name: 'Categorías',
    path: '/configuracion/categorias',
    icon: 'i-lucide-tags',
    order: 250,
    module: 'catalogos',
    parentRef: 6,
  },
  {
    name: 'Metas de ahorro',
    path: '/metas-ahorro',
    icon: 'i-lucide-piggy-bank',
    order: 260,
    module: 'catalogos',
  },
  {
    name: 'Deudas',
    path: '/deudas',
    icon: 'i-lucide-hand-coins',
    order: 270,
    module: 'catalogos',
  },
  {
    name: 'Notificaciones',
    path: '/configuracion/notificaciones',
    icon: 'i-lucide-bell',
    order: 280,
    module: 'catalogos',
    parentRef: 6,
  },
  {
    name: 'Detalle de presupuesto',
    path: '/presupuestos/[id]',
    icon: 'i-lucide-file-text',
    order: 31,
    module: 'finanzas',
    parentRef: 3,
  },
  {
    name: 'Calendario de presupuestos',
    path: '/presupuestos/calendario',
    icon: 'i-lucide-calendar-days',
    order: 32,
    module: 'finanzas',
    parentRef: 3,
  },
  {
    name: 'Analíticas',
    path: '/reportes/analiticas',
    icon: 'i-lucide-chart-no-axes-combined',
    order: 41,
    module: 'finanzas',
    parentRef: 4,
  },
  {
    name: 'Reporte de presupuestos',
    path: '/reportes/presupuestos',
    icon: 'i-lucide-wallet',
    order: 42,
    module: 'finanzas',
    parentRef: 4,
  },
];

export const pantallas = screens;

export const usuarios: SeedUser[] = [
  {
    email: 'superAdmin@god.com',
    password: 'SuperAdmin123#',
    name: 'Super Administrador (Desarrollador)',
    currency: 'MXN',
    timezone: 'America/Monterrey',
    rolRef: 1,
  },
  {
    email: 'admin@proyecto.local',
    password: 'Admin123#',
    name: 'Administrador General',
    currency: 'MXN',
    timezone: 'America/Monterrey',
    rolRef: 2,
  },
  {
    email: 'alan@example.com',
    password: 'Alan123#',
    name: 'Alan',
    currency: 'MXN',
    timezone: 'America/Monterrey',
    rolRef: 2,
  },
];

const fullAccess = (pantallaRef: number): SeedRoleScreen => ({
  pantallaRef,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
});

const readOnly = (pantallaRef: number): SeedRoleScreen => ({
  pantallaRef,
  canRead: true,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
});

const ALL_SCREENS = Array.from({ length: screens.length }, (_, i) => i + 1);

export const permisos: SeedRolePermisos[] = [
  {
    rolRef: 1,
    pantallas: ALL_SCREENS.map(fullAccess),
  },
  {
    rolRef: 2,
    pantallas: ALL_SCREENS.map(fullAccess),
  },
];

// ---------------------------------------------------------------------------
// Datos financieros de ejemplo (ligados al superAdmin = usuarios[0])
// ---------------------------------------------------------------------------

export interface SeedAccount {
  /** Referencia seed-local (1-based) al arreglo `usuarios`. Dueño de la cuenta. */
  usuarioRef: number;
  name: string;
  type: AccountType;
  institution?: string;
  last4?: string;
  currency?: string;
  initialBalance?: number;
  creditLimit?: number;
  isPrimary?: boolean;
}

export interface SeedCategory {
  /** Dueño del catálogo (sus categorías son privadas por usuario). */
  usuarioRef: number;
  name: string;
  kind: CategoryKind;
  icon?: string;
  color?: string;
  sortOrder?: number;
  /**
   * Referencia seed-local (1-based) al rubro padre dentro de `categorias`.
   * Si se omite, es un rubro (nivel 1); si se define, es partida (nivel 2).
   */
  parentRef?: number;
}

export interface SeedDebt {
  usuarioRef: number;
  name: string;
  counterparty?: string;
  reference?: string;
  direction: DebtDirection;
  principalAmount: number;
  status?: DebtStatus;
  dueDate?: string;
  notes?: string;
}

export interface SeedTransaction {
  usuarioRef: number;
  /** Referencia seed-local (1-based) a `cuentas`. */
  cuentaRef: number;
  /** Solo transferencias: referencia a la cuenta destino en `cuentas`. */
  destinoRef?: number;
  /** Referencia seed-local (1-based) a `categorias`. Obligatoria en income/expense, prohibida en transfer. */
  categoriaRef?: number;
  /** Referencia seed-local (1-based) a `deudas`. */
  deudaRef?: number;
  type: TransactionType;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  concept: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  status?: TransactionStatus;
  reference?: string;
}

export interface SeedBudget {
  usuarioRef: number;
  /** Referencia seed-local (1-based) a `categorias`. */
  categoriaRef: number;
  year: number;
  month: number;
  amount: number;
}

export interface SeedSavingGoal {
  usuarioRef: number;
  name: string;
  monthlyContribution: number;
  targetAmount?: number;
  /** Referencia seed-local (1-based) a `cuentas`. */
  cuentaRef?: number;
  /** Referencia seed-local (1-based) a `categorias`. El avance = egresos de esa categoría. */
  categoriaRef?: number;
}

export interface SeedNotification {
  usuarioRef: number;
  title: string;
  body: string;
  type?: NotificationType;
}

export interface SeedBudgetAdjustment {
  /** Dueño (debe coincidir con el dueño del presupuesto referenciado). */
  usuarioRef: number;
  /** Referencia seed-local (1-based) a `presupuestos`. */
  presupuestoRef: number;
  previousAmount: number;
  newAmount: number;
  reason?: string;
  source?: AdjustmentSource;
}

export interface SeedCalendarEvent {
  usuarioRef: number;
  /** Referencia seed-local (1-based) a `categorias`. */
  categoriaRef: number;
  /** Referencia seed-local (1-based) a `presupuestos` (vínculo opcional al techo mensual). */
  presupuestoRef?: number;
  title?: string;
  amount: number;
  /** YYYY-MM-DD inclusive */
  startDate: string;
  /** YYYY-MM-DD inclusive. Igual a startDate = 1 día. */
  endDate: string;
  notes?: string;
  color?: string;
  isAllDay?: boolean;
}

// --- Cuentas del superAdmin (saldos iniciales = pantalla "Cuentas" del diseño) ---
// usuarioRef 3 = alan@example.com (cuentas 4-6)
export const cuentas: SeedAccount[] = [
  {
    usuarioRef: 1,
    name: 'Cuenta Principal',
    type: AccountType.CHECKING,
    institution: 'Banco Principal',
    currency: 'MXN',
    initialBalance: 18479,
    isPrimary: true,
  },
  {
    usuarioRef: 1,
    name: 'Reserva / Ahorro',
    type: AccountType.SAVINGS,
    institution: 'Banco Principal',
    currency: 'MXN',
    initialBalance: 5200,
  },
  {
    usuarioRef: 1,
    name: 'Efectivo / Caja',
    type: AccountType.CASH,
    currency: 'MXN',
    initialBalance: 3670,
  },
  {
    usuarioRef: 3,
    name: 'Cuenta Principal',
    type: AccountType.CHECKING,
    institution: 'BBVA',
    last4: '4821',
    currency: 'MXN',
    initialBalance: 25000,
    isPrimary: true,
  },
  {
    usuarioRef: 3,
    name: 'Reserva / Ahorro',
    type: AccountType.SAVINGS,
    institution: 'BBVA',
    currency: 'MXN',
    initialBalance: 8000,
  },
  {
    usuarioRef: 3,
    name: 'Efectivo Alan',
    type: AccountType.CASH,
    currency: 'MXN',
    initialBalance: 2500,
  },
];

// --- Catálogo de categorías del superAdmin (rubros + partidas, 2 niveles) ---
export const categorias: SeedCategory[] = [
  { usuarioRef: 1, name: 'Sueldo', kind: CategoryKind.INCOME, icon: 'payments', color: '#10b981', sortOrder: 0 },
  { usuarioRef: 1, name: 'Otros', kind: CategoryKind.INCOME, icon: 'work', color: '#06b6d4', sortOrder: 1 },
  { usuarioRef: 1, name: 'Mesada', kind: CategoryKind.INCOME, icon: 'family_restroom', color: '#8b5cf6', sortOrder: 2 },
  { usuarioRef: 1, name: 'Gastos', kind: CategoryKind.EXPENSE, icon: 'shopping_cart', color: '#3b82f6', sortOrder: 3 },
  { usuarioRef: 1, name: 'Supermercado y despensa', kind: CategoryKind.EXPENSE, icon: 'shopping_basket', color: '#3b82f6', parentRef: 4 },
  { usuarioRef: 1, name: 'Restaurantes y ocio', kind: CategoryKind.EXPENSE, icon: 'restaurant', color: '#3b82f6', parentRef: 4 },
  { usuarioRef: 1, name: 'Varios e imprevistos', kind: CategoryKind.EXPENSE, icon: 'inventory_2', color: '#3b82f6', parentRef: 4 },
  { usuarioRef: 1, name: 'Servicios', kind: CategoryKind.EXPENSE, icon: 'bolt', color: '#10b981', sortOrder: 4 },
  { usuarioRef: 1, name: 'Renta departamento', kind: CategoryKind.EXPENSE, icon: 'home_work', color: '#10b981', parentRef: 8 },
  { usuarioRef: 1, name: 'Lavandería', kind: CategoryKind.EXPENSE, icon: 'local_laundry_service', color: '#10b981', parentRef: 8 },
  { usuarioRef: 1, name: 'Internet', kind: CategoryKind.EXPENSE, icon: 'wifi', color: '#10b981', parentRef: 8 },
  { usuarioRef: 1, name: 'Datos celulares', kind: CategoryKind.EXPENSE, icon: 'smartphone', color: '#10b981', parentRef: 8 },
  { usuarioRef: 1, name: 'Taxi', kind: CategoryKind.EXPENSE, icon: 'local_taxi', color: '#10b981', parentRef: 8 },
  { usuarioRef: 1, name: 'Ahorro', kind: CategoryKind.SAVINGS, icon: 'savings', color: '#adc6ff', sortOrder: 5 },
  { usuarioRef: 1, name: 'Ahorro semanal', kind: CategoryKind.SAVINGS, icon: 'savings', color: '#adc6ff', parentRef: 14 },
  { usuarioRef: 1, name: 'Deudas', kind: CategoryKind.DEBT, icon: 'request_quote', color: '#f43f5e', sortOrder: 6 },
  { usuarioRef: 1, name: 'Dinero prestado', kind: CategoryKind.DEBT, icon: 'handshake', color: '#f43f5e', parentRef: 16 },
  // --- Catálogo clonado para alan@example.com (usuarioRef 3, refs 18-34) ---
  { usuarioRef: 3, name: 'Sueldo', kind: CategoryKind.INCOME, icon: 'payments', color: '#10b981', sortOrder: 0 },
  { usuarioRef: 3, name: 'Otros', kind: CategoryKind.INCOME, icon: 'work', color: '#06b6d4', sortOrder: 1 },
  { usuarioRef: 3, name: 'Mesada', kind: CategoryKind.INCOME, icon: 'family_restroom', color: '#8b5cf6', sortOrder: 2 },
  { usuarioRef: 3, name: 'Gastos', kind: CategoryKind.EXPENSE, icon: 'shopping_cart', color: '#3b82f6', sortOrder: 3 },
  { usuarioRef: 3, name: 'Supermercado y despensa', kind: CategoryKind.EXPENSE, icon: 'shopping_basket', color: '#3b82f6', parentRef: 21 },
  { usuarioRef: 3, name: 'Restaurantes y ocio', kind: CategoryKind.EXPENSE, icon: 'restaurant', color: '#3b82f6', parentRef: 21 },
  { usuarioRef: 3, name: 'Varios e imprevistos', kind: CategoryKind.EXPENSE, icon: 'inventory_2', color: '#3b82f6', parentRef: 21 },
  { usuarioRef: 3, name: 'Servicios', kind: CategoryKind.EXPENSE, icon: 'bolt', color: '#10b981', sortOrder: 4 },
  { usuarioRef: 3, name: 'Renta departamento', kind: CategoryKind.EXPENSE, icon: 'home_work', color: '#10b981', parentRef: 25 },
  { usuarioRef: 3, name: 'Lavandería', kind: CategoryKind.EXPENSE, icon: 'local_laundry_service', color: '#10b981', parentRef: 25 },
  { usuarioRef: 3, name: 'Internet', kind: CategoryKind.EXPENSE, icon: 'wifi', color: '#10b981', parentRef: 25 },
  { usuarioRef: 3, name: 'Datos celulares', kind: CategoryKind.EXPENSE, icon: 'smartphone', color: '#10b981', parentRef: 25 },
  { usuarioRef: 3, name: 'Taxi', kind: CategoryKind.EXPENSE, icon: 'local_taxi', color: '#10b981', parentRef: 25 },
  { usuarioRef: 3, name: 'Ahorro', kind: CategoryKind.SAVINGS, icon: 'savings', color: '#adc6ff', sortOrder: 5 },
  { usuarioRef: 3, name: 'Ahorro semanal', kind: CategoryKind.SAVINGS, icon: 'savings', color: '#adc6ff', parentRef: 31 },
  { usuarioRef: 3, name: 'Deudas', kind: CategoryKind.DEBT, icon: 'request_quote', color: '#f43f5e', sortOrder: 6 },
  { usuarioRef: 3, name: 'Dinero prestado', kind: CategoryKind.DEBT, icon: 'handshake', color: '#f43f5e', parentRef: 33 },
];

// --- Deudas: 1 = superAdmin, 2-6 = alan@example.com (detalle + historial) ---
export const deudas: SeedDebt[] = [
  {
    usuarioRef: 1,
    name: 'Dinero prestado',
    reference: '#D892',
    direction: DebtDirection.RECEIVABLE,
    principalAmount: 3000,
    dueDate: '2025-11-15',
    notes: 'Préstamo a familiar, pago en una exhibición',
  },
  {
    usuarioRef: 3,
    name: 'Préstamo auto',
    counterparty: 'Banco XYZ',
    reference: 'CRED-001',
    direction: DebtDirection.PAYABLE,
    principalAmount: 50000,
    status: DebtStatus.OPEN,
    dueDate: '2026-03-15',
    notes: 'Mensualidad los días 15. Abonos como expense con deudaRef.',
  },
  {
    usuarioRef: 3,
    name: 'Tarjeta Liverpool',
    counterparty: 'Liverpool',
    reference: 'TC-2025-09',
    direction: DebtDirection.PAYABLE,
    principalAmount: 12500,
    status: DebtStatus.OPEN,
    dueDate: '2025-11-30',
    notes: 'Meses sin intereses. Vence a fin de noviembre.',
  },
  {
    usuarioRef: 3,
    name: 'Préstamo a Carlos',
    counterparty: 'Carlos Mendoza',
    reference: '#D901',
    direction: DebtDirection.RECEIVABLE,
    principalAmount: 8000,
    status: DebtStatus.OPEN,
    dueDate: '2025-12-20',
    notes: 'Préstamo personal, cobro en 2 pagos. Cobros como income con deudaRef.',
  },
  {
    usuarioRef: 3,
    name: 'Laptop MSI (liquidada)',
    counterparty: 'Tienda PC',
    reference: 'MSI-2025-06',
    direction: DebtDirection.PAYABLE,
    principalAmount: 18000,
    status: DebtStatus.PAID,
    dueDate: '2025-09-30',
    notes: 'Historial: liquidada en octubre. Sirve para probar filtro status=paid.',
  },
  {
    usuarioRef: 3,
    name: 'Dinero prestado a familiar',
    counterparty: 'Familiar',
    reference: '#D902',
    direction: DebtDirection.RECEIVABLE,
    principalAmount: 3000,
    status: DebtStatus.OPEN,
    dueDate: '2025-11-15',
    notes: 'Pago en una exhibición.',
  },
];

// --- Transacciones de octubre 2025 (ingresos 20,100 / egresos 26,619 / neto -6,519) ---
export const transacciones: SeedTransaction[] = [
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 9, type: TransactionType.EXPENSE, amount: 6700, date: '2025-10-28', concept: 'Renta departamento', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 1, type: TransactionType.INCOME, amount: 5800, date: '2025-10-25', concept: 'Sueldo quincenal', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 17, deudaRef: 1, type: TransactionType.EXPENSE, amount: 3000, date: '2025-10-24', concept: 'Dinero prestado', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.PENDING, reference: '#D892' },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 2, type: TransactionType.INCOME, amount: 9300, date: '2025-10-20', concept: 'Consultoría y rendimientos', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, destinoRef: 2, type: TransactionType.TRANSFER, amount: 1000, date: '2025-10-19', concept: 'Traspaso a ahorro', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 4, type: TransactionType.EXPENSE, amount: 15144, date: '2025-10-18', concept: 'Supermercado y provisiones', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 3, type: TransactionType.INCOME, amount: 5000, date: '2025-10-15', concept: 'Mesada familiar', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 11, type: TransactionType.EXPENSE, amount: 635, date: '2025-10-12', concept: 'Internet fibra óptica', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 15, type: TransactionType.EXPENSE, amount: 500, date: '2025-10-10', concept: 'Ahorro semanal', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 3, categoriaRef: 10, type: TransactionType.EXPENSE, amount: 430, date: '2025-10-08', concept: 'Lavandería', paymentMethod: PaymentMethod.CASH, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 1, categoriaRef: 12, type: TransactionType.EXPENSE, amount: 150, date: '2025-10-05', concept: 'Datos celulares', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED },
  { usuarioRef: 1, cuentaRef: 3, categoriaRef: 13, type: TransactionType.EXPENSE, amount: 60, date: '2025-10-02', concept: 'Taxi', paymentMethod: PaymentMethod.CASH, status: TransactionStatus.RECONCILED },
  // --- Movimientos de alan@example.com (octubre 2025, cuentas 4-6 / categorías 18-34 / deudas 2-6) ---
  // Base para presupuestos: ingresos 20,000 / egresos operativos + abonos a deudas
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 18, type: TransactionType.INCOME, amount: 15000, date: '2025-10-15', concept: 'Sueldo quincenal Alan', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 19, type: TransactionType.INCOME, amount: 5000, date: '2025-10-20', concept: 'Freelance diseño', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 26, type: TransactionType.EXPENSE, amount: 6700, date: '2025-10-28', concept: 'Renta departamento', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 22, type: TransactionType.EXPENSE, amount: 4200, date: '2025-10-18', concept: 'Supermercado y provisiones', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 28, type: TransactionType.EXPENSE, amount: 635, date: '2025-10-12', concept: 'Internet fibra óptica', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED },
  // Detalle de deudas: abonos (expense + deudaRef) y préstamo/cobro
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 2, type: TransactionType.EXPENSE, amount: 4000, date: '2025-10-15', concept: 'Abono préstamo auto (oct)', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED, reference: 'CRED-001' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 3, type: TransactionType.EXPENSE, amount: 2500, date: '2025-10-10', concept: 'Abono tarjeta Liverpool', paymentMethod: PaymentMethod.DEBIT_CARD, status: TransactionStatus.RECONCILED, reference: 'TC-2025-09' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 4, type: TransactionType.EXPENSE, amount: 8000, date: '2025-10-05', concept: 'Préstamo a Carlos (salida)', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED, reference: '#D901' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 19, deudaRef: 4, type: TransactionType.INCOME, amount: 3000, date: '2025-10-25', concept: 'Cobro parcial Carlos', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED, reference: '#D901' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 5, type: TransactionType.EXPENSE, amount: 9000, date: '2025-10-02', concept: 'Liquida laptop MSI pago 1/2', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED, reference: 'MSI-2025-06' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 5, type: TransactionType.EXPENSE, amount: 9000, date: '2025-10-22', concept: 'Liquida laptop MSI pago 2/2', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.RECONCILED, reference: 'MSI-2025-06' },
  { usuarioRef: 3, cuentaRef: 4, categoriaRef: 34, deudaRef: 6, type: TransactionType.EXPENSE, amount: 3000, date: '2025-10-24', concept: 'Dinero prestado a familiar', paymentMethod: PaymentMethod.BANK_TRANSFER, status: TransactionStatus.PENDING, reference: '#D902' },
];

// --- Presupuestos: 1-10 = superAdmin oct-2025, 11+ = alan@example.com ---
export const presupuestos: SeedBudget[] = [
  { usuarioRef: 1, categoriaRef: 1, year: 2025, month: 10, amount: 6000 },
  { usuarioRef: 1, categoriaRef: 2, year: 2025, month: 10, amount: 9200 },
  { usuarioRef: 1, categoriaRef: 3, year: 2025, month: 10, amount: 5000 },
  { usuarioRef: 1, categoriaRef: 4, year: 2025, month: 10, amount: 13811 },
  { usuarioRef: 1, categoriaRef: 15, year: 2025, month: 10, amount: 500 },
  { usuarioRef: 1, categoriaRef: 9, year: 2025, month: 10, amount: 6700 },
  { usuarioRef: 1, categoriaRef: 10, year: 2025, month: 10, amount: 550 },
  { usuarioRef: 1, categoriaRef: 11, year: 2025, month: 10, amount: 500 },
  { usuarioRef: 1, categoriaRef: 12, year: 2025, month: 10, amount: 150 },
  { usuarioRef: 1, categoriaRef: 13, year: 2025, month: 10, amount: 120 },
  // Alan oct-2025 (detalle por rubro + partidas, cuadra con transacciones)
  { usuarioRef: 3, categoriaRef: 18, year: 2025, month: 10, amount: 15000 },
  { usuarioRef: 3, categoriaRef: 19, year: 2025, month: 10, amount: 5000 },
  { usuarioRef: 3, categoriaRef: 20, year: 2025, month: 10, amount: 3000 },
  { usuarioRef: 3, categoriaRef: 21, year: 2025, month: 10, amount: 4500 },
  { usuarioRef: 3, categoriaRef: 32, year: 2025, month: 10, amount: 800 },
  { usuarioRef: 3, categoriaRef: 26, year: 2025, month: 10, amount: 6700 },
  { usuarioRef: 3, categoriaRef: 27, year: 2025, month: 10, amount: 550 },
  { usuarioRef: 3, categoriaRef: 28, year: 2025, month: 10, amount: 500 },
  { usuarioRef: 3, categoriaRef: 29, year: 2025, month: 10, amount: 200 },
  { usuarioRef: 3, categoriaRef: 30, year: 2025, month: 10, amount: 150 },
  // Alan sep-2025 (para probar copy sep->nov y comparativas)
  { usuarioRef: 3, categoriaRef: 21, year: 2025, month: 9, amount: 4000 },
  { usuarioRef: 3, categoriaRef: 26, year: 2025, month: 9, amount: 6700 },
  { usuarioRef: 3, categoriaRef: 18, year: 2025, month: 9, amount: 15000 },
  // Alan nov-2025 parcial (para probar copy con skip: Renta ya existe)
  { usuarioRef: 3, categoriaRef: 26, year: 2025, month: 11, amount: 6700 },
];

// --- Historial de ajustes (budget_adjustments): previous -> new encadena hasta el amount actual ---
export const ajustesPresupuesto: SeedBudgetAdjustment[] = [
  // superAdmin: Gastos oct 13000 -> 13811
  { usuarioRef: 1, presupuestoRef: 4, previousAmount: 13000, newAmount: 13811, reason: 'Cierre octubre: despensa extra', source: AdjustmentSource.MANUAL },
  // Alan: Gastos oct 4000 -> 4500
  { usuarioRef: 3, presupuestoRef: 14, previousAmount: 4000, newAmount: 4500, reason: 'Ajuste quincenal + despensa', source: AdjustmentSource.MANUAL },
  // Alan: Renta oct 6500 -> 6700
  { usuarioRef: 3, presupuestoRef: 16, previousAmount: 6500, newAmount: 6700, reason: 'Incremento renta octubre', source: AdjustmentSource.MANUAL },
  // Alan: Sueldo oct 14000 -> 15000 (sistema)
  { usuarioRef: 3, presupuestoRef: 11, previousAmount: 14000, newAmount: 15000, reason: 'Actualización nómina', source: AdjustmentSource.SYSTEM },
  // Alan: Internet oct 600 -> 500 (recorte)
  { usuarioRef: 3, presupuestoRef: 18, previousAmount: 600, newAmount: 500, reason: 'Cambio de plan', source: AdjustmentSource.MANUAL },
];

// --- Calendario de presupuestos (budget_calendar_events) de alan@example.com, oct-2025 ---
export const eventosCalendario: SeedCalendarEvent[] = [
  {
    usuarioRef: 3,
    categoriaRef: 26,
    presupuestoRef: 16,
    title: 'Renta departamento',
    amount: 6700,
    startDate: '2025-10-01',
    endDate: '2025-10-01',
    notes: 'Pago puntual día 1',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 28,
    presupuestoRef: 18,
    title: 'Internet fibra óptica',
    amount: 635,
    startDate: '2025-10-12',
    endDate: '2025-10-12',
    notes: 'Domiciliado a tarjeta',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 22,
    presupuestoRef: 14,
    title: 'Despensa quincenal',
    amount: 4200,
    startDate: '2025-10-18',
    endDate: '2025-10-20',
    notes: 'Barra multidía: súper + mercado',
    color: '#3b82f6',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 34,
    title: 'Abono préstamo auto',
    amount: 4000,
    startDate: '2025-10-15',
    endDate: '2025-10-15',
    notes: 'Mensualidad CRED-001',
    color: '#f43f5e',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 34,
    title: 'Abono Liverpool',
    amount: 2500,
    startDate: '2025-10-10',
    endDate: '2025-10-11',
    notes: 'Barra 2 días: pago + reflejo bancario',
    color: '#f43f5e',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 32,
    presupuestoRef: 15,
    title: 'Ahorro semanal',
    amount: 800,
    startDate: '2025-10-10',
    endDate: '2025-10-10',
    notes: 'Traspaso a reserva',
    isAllDay: true,
  },
  {
    usuarioRef: 3,
    categoriaRef: 19,
    presupuestoRef: 12,
    title: 'Cobro freelance',
    amount: 5000,
    startDate: '2025-10-20',
    endDate: '2025-10-20',
    notes: 'Ingreso extra del mes',
    color: '#06b6d4',
    isAllDay: true,
  },
];

// --- Meta + notificaciones de ejemplo ---
export const metasAhorro: SeedSavingGoal[] = [
  { usuarioRef: 1, name: 'Ahorro semanal', monthlyContribution: 500, targetAmount: 10000, cuentaRef: 2, categoriaRef: 15 },
];

export const notificaciones: SeedNotification[] = [
  { usuarioRef: 1, title: 'Bienvenido a Capital Flow', body: 'Ambiente de prueba listo: explora Dashboard, Transacciones y Presupuestos.', type: NotificationType.SUCCESS },
  { usuarioRef: 1, title: 'Presupuesto excedido', body: 'El rubro Gastos supera lo planeado de octubre 2025.', type: NotificationType.WARNING },
];
