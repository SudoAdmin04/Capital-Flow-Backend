import { ConflictException } from '@nestjs/common';

function isUniqueViolation(e: any): boolean {
  const code = e?.code ?? e?.driverError?.code;
  return code === '23505';
}

/** Re-lanza violaciones de unicidad como 409 con mensaje de negocio. */
export function rethrowUnique(e: unknown, message: string): never {
  if (isUniqueViolation(e)) throw new ConflictException(message);
  throw e;
}
