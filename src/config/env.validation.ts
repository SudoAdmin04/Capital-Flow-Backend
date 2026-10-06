export function validateEnv(config: Record<string, unknown>) {
  const secret = String(config.JWT_SECRET ?? '');
  if (secret.length < 32) {
    throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
  }
  if (config.NODE_ENV === 'production' && config.DB_SYNCHRONIZE === 'true') {
    throw new Error('DB_SYNCHRONIZE=true no esta permitido en produccion; usa migraciones');
  }
  return config;
}
