import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completa el esquema que faltaba en las migraciones iniciales:
 * RBAC (roles/screens/role_screens + users.roleId), notificaciones y
 * calendario de presupuestos.
 *
 * Usa IF NOT EXISTS para poder aplicarse sobre bases creadas con
 * DB_SYNCHRONIZE=true sin romper si las tablas ya existen.
 */
export class AddRbacNotificationsAndCalendar1793600000000 implements MigrationInterface {
  name = 'AddRbacNotificationsAndCalendar1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // --- roles ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" SERIAL NOT NULL,
        "name" character varying(80) NOT NULL,
        "description" character varying(200),
        "isAdmin" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name" ON "roles" ("name")`,
    );

    // --- screens ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "screens" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "path" character varying(160),
        "icon" character varying(80),
        "order" integer NOT NULL DEFAULT 0,
        "module" character varying(80),
        "parentId" integer,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_screens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_screens_parent" FOREIGN KEY ("parentId")
          REFERENCES "screens"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_screens_name" ON "screens" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_screens_module" ON "screens" ("module")`,
    );

    // --- role_screens ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_screens" (
        "id" SERIAL NOT NULL,
        "roleId" integer NOT NULL,
        "screenId" integer NOT NULL,
        "module" character varying(80),
        "canRead" boolean NOT NULL DEFAULT false,
        "canCreate" boolean NOT NULL DEFAULT false,
        "canUpdate" boolean NOT NULL DEFAULT false,
        "canDelete" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_screens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_screens_role_screen" UNIQUE ("roleId", "screenId"),
        CONSTRAINT "FK_role_screens_role" FOREIGN KEY ("roleId")
          REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_role_screens_screen" FOREIGN KEY ("screenId")
          REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // --- users.roleId ---
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" integer`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_role'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "FK_users_role"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    // --- notifications ---
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notification_type'
        ) THEN
          CREATE TYPE "public"."notification_type"
            AS ENUM('info', 'warning', 'success', 'error');
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "title" character varying(160) NOT NULL,
        "body" text NOT NULL,
        "type" "public"."notification_type" NOT NULL DEFAULT 'info',
        "isRead" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("userId")`,
    );

    // --- budget_calendar_events ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_calendar_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "budgetId" uuid,
        "title" character varying(120) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "notes" text,
        "color" character varying(7),
        "isAllDay" boolean NOT NULL DEFAULT true,
        CONSTRAINT "CHK_budget_calendar_event_dates" CHECK ("endDate" >= "startDate"),
        CONSTRAINT "CHK_budget_calendar_event_amount" CHECK ("amount" >= 0),
        CONSTRAINT "PK_budget_calendar_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budget_calendar_events_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_calendar_events_category" FOREIGN KEY ("categoryId")
          REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budget_calendar_events_budget" FOREIGN KEY ("budgetId")
          REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_calendar_events_user" ON "budget_calendar_events" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_calendar_events_user_start" ON "budget_calendar_events" ("userId", "startDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_calendar_events_user_end" ON "budget_calendar_events" ("userId", "endDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_calendar_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notification_type"`);

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "roleId"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "role_screens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "screens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
