import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerSkillScores1774878000000 implements MigrationInterface {
  name = 'AddPlayerSkillScores1774878000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_profiles" ADD "skill_scores" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_profiles" DROP COLUMN "skill_scores"`,
    );
  }
}
