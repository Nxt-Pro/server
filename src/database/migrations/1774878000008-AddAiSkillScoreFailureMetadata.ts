import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSkillScoreFailureMetadata1774878000008 implements MigrationInterface {
  name = 'AddAiSkillScoreFailureMetadata1774878000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      ADD COLUMN "failure_code" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      ADD COLUMN "failure_details" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      ADD COLUMN "retryable" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      DROP COLUMN "retryable"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      DROP COLUMN "failure_details"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_skill_score_jobs"
      DROP COLUMN "failure_code"
    `);
  }
}
