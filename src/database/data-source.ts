import 'dotenv/config';
import { DataSource } from 'typeorm';

/** DataSource usado por el CLI de TypeORM (migraciones). */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'finanzas',
  password: process.env.DB_PASSWORD ?? 'finanzas',
  database: process.env.DB_NAME ?? 'finanzas',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
