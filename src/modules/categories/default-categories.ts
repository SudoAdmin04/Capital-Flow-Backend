import { CategoryKind } from '../../common/enums';

interface DefaultCategory {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  children?: { name: string; icon: string }[];
}

/** Rubros y partidas tomados de la hoja de Excel original. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Sueldo', kind: CategoryKind.INCOME, icon: 'payments', color: '#10b981' },
  { name: 'Otros', kind: CategoryKind.INCOME, icon: 'work', color: '#06b6d4' },
  { name: 'Mesada', kind: CategoryKind.INCOME, icon: 'family_restroom', color: '#8b5cf6' },
  {
    name: 'Gastos',
    kind: CategoryKind.EXPENSE,
    icon: 'shopping_cart',
    color: '#3b82f6',
    children: [
      { name: 'Supermercado y despensa', icon: 'shopping_basket' },
      { name: 'Restaurantes y ocio', icon: 'restaurant' },
      { name: 'Varios e imprevistos', icon: 'inventory_2' },
    ],
  },
  {
    name: 'Servicios',
    kind: CategoryKind.EXPENSE,
    icon: 'bolt',
    color: '#10b981',
    children: [
      { name: 'Renta departamento', icon: 'home_work' },
      { name: 'Lavandería', icon: 'local_laundry_service' },
      { name: 'Internet', icon: 'wifi' },
      { name: 'Datos celulares', icon: 'smartphone' },
      { name: 'Taxi', icon: 'local_taxi' },
    ],
  },
  {
    name: 'Ahorro',
    kind: CategoryKind.SAVINGS,
    icon: 'savings',
    color: '#adc6ff',
    children: [{ name: 'Ahorro semanal', icon: 'savings' }],
  },
  {
    name: 'Deudas',
    kind: CategoryKind.DEBT,
    icon: 'request_quote',
    color: '#f43f5e',
    children: [{ name: 'Dinero prestado', icon: 'handshake' }],
  },
];
