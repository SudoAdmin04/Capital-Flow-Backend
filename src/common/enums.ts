export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
}

export enum CategoryKind {
  INCOME = 'income',
  EXPENSE = 'expense',
  SAVINGS = 'savings',
  DEBT = 'debt',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  RECONCILED = 'reconciled',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
}

export enum DebtDirection {
  PAYABLE = 'payable',
  RECEIVABLE = 'receivable',
}

export enum DebtStatus {
  OPEN = 'open',
  PAID = 'paid',
}

export enum AdjustmentSource {
  MANUAL = 'manual',
  SYSTEM = 'system',
}

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}
