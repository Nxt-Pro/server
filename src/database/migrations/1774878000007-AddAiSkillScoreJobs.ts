import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSkillScoreJobs1774878000007 implements MigrationInterface {
  name = 'AddAiSkillScoreJobs1774878000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'skill_score'
        ) THEN
          ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'skill_score';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."ai_skill_score_jobs_status_enum"
      AS ENUM('queued', 'processing', 'completed', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_skill_score_jobs" (
        "id" character varying(26) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "player_id" char(26) NOT NULL,
        "requested_by" char(26) NOT NULL,
        "queue_job_id" character varying(100),
        "skill_key" character varying(50) NOT NULL,
        "display_name" character varying(80) NOT NULL,
        "profile_skill_key" character varying(50) NOT NULL,
        "service_name" character varying(80) NOT NULL,
        "status" "public"."ai_skill_score_jobs_status_enum" NOT NULL DEFAULT 'queued',
        "input" jsonb NOT NULL DEFAULT '{}',
        "result" jsonb,
        "score" numeric(5,2),
        "confidence" numeric(5,4),
        "model_version" character varying(80),
        "summary" text,
        "failure_reason" text,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_ai_skill_score_jobs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_skill_score_jobs_player_skill_status"
      ON "ai_skill_score_jobs" ("player_id", "skill_key", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_skill_score_jobs_requested_created"
      ON "ai_skill_score_jobs" ("requested_by", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_skill_score_jobs_queue_job_id"
      ON "ai_skill_score_jobs" ("queue_job_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      ADD CONSTRAINT "FK_ai_skill_score_jobs_player_id"
      FOREIGN KEY ("player_id")
      REFERENCES "player_profiles"("user_id")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      ADD CONSTRAINT "FK_ai_skill_score_jobs_requested_by"
      FOREIGN KEY ("requested_by")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      DROP CONSTRAINT "FK_ai_skill_score_jobs_requested_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      DROP CONSTRAINT "FK_ai_skill_score_jobs_player_id"
    `);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_skill_score_jobs_queue_job_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_skill_score_jobs_requested_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_skill_score_jobs_player_skill_status"`,
    );
    await queryRunner.query(`DROP TABLE "ai_skill_score_jobs"`);
    await queryRunner.query(
      `DROP TYPE "public"."ai_skill_score_jobs_status_enum"`,
    );

    await queryRunner.query(`
      UPDATE "notifications"
      SET "type" = 'marketing'
      WHERE "type"::text = 'skill_score'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_new"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum"
      AS ENUM('like', 'comment', 'message', 'connection_request', 'verification', 'marketing', 'new_event')
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" TYPE "public"."notifications_type_enum"
      USING "type"::text::"public"."notifications_type_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_new"`);
  }
}
