import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSavingsGoalEntries1791296383292 implements MigrationInterface {
    name = 'AddSavingsGoalEntries1791296383292'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."savings_goal_entry_kind" AS ENUM('deposit', 'withdrawal')`);
        await queryRunner.query(`CREATE TABLE "savings_goal_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "goalId" uuid NOT NULL, "kind" "public"."savings_goal_entry_kind" NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "accountId" uuid, "transactionId" uuid, "concept" character varying(160), CONSTRAINT "CHK_savings_goal_entry_amount" CHECK ("amount" > 0), CONSTRAINT "PK_savings_goal_entries" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_savings_goal_entries_user" ON "savings_goal_entries" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_savings_goal_entries_user_goal" ON "savings_goal_entries" ("userId", "goalId") `);
        await queryRunner.query(`CREATE INDEX "IDX_savings_goal_entries_user_goal_date" ON "savings_goal_entries" ("userId", "goalId", "date") `);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" ADD CONSTRAINT "FK_savings_goal_entries_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" ADD CONSTRAINT "FK_savings_goal_entries_goal" FOREIGN KEY ("goalId") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" ADD CONSTRAINT "FK_savings_goal_entries_account" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" ADD CONSTRAINT "FK_savings_goal_entries_tx" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" DROP CONSTRAINT "FK_savings_goal_entries_tx"`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" DROP CONSTRAINT "FK_savings_goal_entries_account"`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" DROP CONSTRAINT "FK_savings_goal_entries_goal"`);
        await queryRunner.query(`ALTER TABLE "savings_goal_entries" DROP CONSTRAINT "FK_savings_goal_entries_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_savings_goal_entries_user_goal_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_savings_goal_entries_user_goal"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_savings_goal_entries_user"`);
        await queryRunner.query(`DROP TABLE "savings_goal_entries"`);
        await queryRunner.query(`DROP TYPE "public"."savings_goal_entry_kind"`);
    }
}
