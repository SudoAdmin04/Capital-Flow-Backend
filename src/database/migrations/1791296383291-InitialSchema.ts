import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791296383291 implements MigrationInterface {
    name = 'InitialSchema1791296383291'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(254) NOT NULL, "passwordHash" character varying(100) NOT NULL, "name" character varying(120) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'MXN', "timezone" character varying(64) NOT NULL DEFAULT 'America/Monterrey', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'cash', 'credit_card')`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "name" character varying(80) NOT NULL, "type" "public"."account_type" NOT NULL, "institution" character varying(80), "last4" character(4), "currency" character(3) NOT NULL DEFAULT 'MXN', "initialBalance" numeric(14,2) NOT NULL DEFAULT '0', "creditLimit" numeric(14,2), "isPrimary" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3aa23c0a6d107393e8b40e3e2a" ON "accounts" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f6653d6268c6ed47b4570a16ca" ON "accounts" ("userId", "name") `);
        await queryRunner.query(`CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense', 'savings', 'debt')`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "name" character varying(80) NOT NULL, "kind" "public"."category_kind" NOT NULL, "parentId" uuid, "color" character varying(7), "icon" character varying(40), "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_13e8b2a21988bec6fdcbb1fa74" ON "categories" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d44c6051c42771fedae3a38893" ON "categories" ("userId", "parentId", "name") `);
        await queryRunner.query(`CREATE TYPE "public"."debt_direction" AS ENUM('payable', 'receivable')`);
        await queryRunner.query(`CREATE TYPE "public"."debt_status" AS ENUM('open', 'paid')`);
        await queryRunner.query(`CREATE TABLE "debts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "name" character varying(120) NOT NULL, "counterparty" character varying(120), "reference" character varying(60), "direction" "public"."debt_direction" NOT NULL DEFAULT 'payable', "principalAmount" numeric(14,2) NOT NULL, "status" "public"."debt_status" NOT NULL DEFAULT 'open', "dueDate" date, "notes" text, CONSTRAINT "PK_4bd9f54aab9e59628a3a2657fa1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_834960a509c776eb841644a9ba" ON "debts" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'debit_card', 'credit_card', 'cash')`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'reconciled')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "accountId" uuid NOT NULL, "destinationAccountId" uuid, "categoryId" uuid, "debtId" uuid, "type" "public"."transaction_type" NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "concept" character varying(160) NOT NULL, "description" text, "paymentMethod" "public"."payment_method", "status" "public"."transaction_status" NOT NULL DEFAULT 'pending', "reconciledAt" TIMESTAMP WITH TIME ZONE, "reference" character varying(60), CONSTRAINT "CHK_62aa055cd540df8774499ba22b" CHECK ("amount" > 0), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_26d8aec71ae9efbe468043cd2b" ON "transactions" ("accountId") `);
        await queryRunner.query(`CREATE INDEX "IDX_806b1bb48cd59d2be1ffc607e6" ON "transactions" ("userId", "categoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_31c0fafe7c59f688d0e7e7e322" ON "transactions" ("userId", "date") `);
        await queryRunner.query(`CREATE TABLE "savings_goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "name" character varying(120) NOT NULL, "monthlyContribution" numeric(14,2) NOT NULL, "targetAmount" numeric(14,2), "accountId" uuid, "categoryId" uuid, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_4f1e133521cfbf2b4252bd8f09d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_016b69b77386ed555edf7c6662" ON "savings_goals" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."adjustment_source" AS ENUM('manual', 'system')`);
        await queryRunner.query(`CREATE TABLE "budget_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "budgetId" uuid NOT NULL, "previousAmount" numeric(14,2) NOT NULL, "newAmount" numeric(14,2) NOT NULL, "reason" character varying(200), "source" "public"."adjustment_source" NOT NULL DEFAULT 'manual', CONSTRAINT "PK_20947d9911993affc5e0d6428f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3adab3ea62f5c3256f5ada0d0a" ON "budget_adjustments" ("budgetId") `);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "categoryId" uuid NOT NULL, "year" smallint NOT NULL, "month" smallint NOT NULL, "amount" numeric(14,2) NOT NULL, CONSTRAINT "UQ_21907957c46a0a5bae5bfb38066" UNIQUE ("userId", "categoryId", "year", "month"), CONSTRAINT "CHK_34fca8272cde0d9bf611a01100" CHECK ("amount" >= 0), CONSTRAINT "CHK_d8702cff4facbe6974f756a71a" CHECK ("month" BETWEEN 1 AND 12), CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_27e688ddf1ff3893b43065899f" ON "budgets" ("userId") `);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "debts" ADD CONSTRAINT "FK_834960a509c776eb841644a9bac" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e704cd38335d6b334f2fce8caf9" FOREIGN KEY ("destinationAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_fb129ca311eda71f73f1bd0a0ef" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_016b69b77386ed555edf7c66620" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_ca7be772ea270170037a2cb6341" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_b0dee51d0408621eb53a562bcbe" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_adjustments" ADD CONSTRAINT "FK_3adab3ea62f5c3256f5ada0d0a3" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_27e688ddf1ff3893b43065899f9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_27e688ddf1ff3893b43065899f9"`);
        await queryRunner.query(`ALTER TABLE "budget_adjustments" DROP CONSTRAINT "FK_3adab3ea62f5c3256f5ada0d0a3"`);
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_b0dee51d0408621eb53a562bcbe"`);
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_ca7be772ea270170037a2cb6341"`);
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_016b69b77386ed555edf7c66620"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_fb129ca311eda71f73f1bd0a0ef"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e704cd38335d6b334f2fce8caf9"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "debts" DROP CONSTRAINT "FK_834960a509c776eb841644a9bac"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_27e688ddf1ff3893b43065899f"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3adab3ea62f5c3256f5ada0d0a"`);
        await queryRunner.query(`DROP TABLE "budget_adjustments"`);
        await queryRunner.query(`DROP TYPE "public"."adjustment_source"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_016b69b77386ed555edf7c6662"`);
        await queryRunner.query(`DROP TABLE "savings_goals"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31c0fafe7c59f688d0e7e7e322"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_806b1bb48cd59d2be1ffc607e6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26d8aec71ae9efbe468043cd2b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_status"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_834960a509c776eb841644a9ba"`);
        await queryRunner.query(`DROP TABLE "debts"`);
        await queryRunner.query(`DROP TYPE "public"."debt_status"`);
        await queryRunner.query(`DROP TYPE "public"."debt_direction"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d44c6051c42771fedae3a38893"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13e8b2a21988bec6fdcbb1fa74"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TYPE "public"."category_kind"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6653d6268c6ed47b4570a16ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3aa23c0a6d107393e8b40e3e2a"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TYPE "public"."account_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
