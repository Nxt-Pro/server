import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFcmTokensToUsers1774878000001 implements MigrationInterface {
  name = 'AddFcmTokensToUsers1774878000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fcm_tokens" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_tokens"`,
    );
  }
}
