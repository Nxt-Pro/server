import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFcmTokensToUser1770000000001 implements MigrationInterface {
  name = 'AddFcmTokensToUser1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "fcm_tokens" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fcm_tokens"`);
  }
}
