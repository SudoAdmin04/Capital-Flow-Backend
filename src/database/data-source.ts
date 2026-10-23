import 'dotenv/config';
import { DataSource } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? {
        url: databaseUrl,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'finanzas',
        password: process.env.DB_PASSWORD ?? 'finanzas',
        database: process.env.DB_NAME ?? 'finanzas',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      }),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
