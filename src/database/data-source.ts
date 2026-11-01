import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildPostgresOptions } from '../config/database.config';

export default new DataSource({
  ...buildPostgresOptions((key, fallback) => process.env[key] ?? fallback),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
