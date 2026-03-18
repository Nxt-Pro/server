import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSecurityColumns1773777498454 implements MigrationInterface {
  name = 'AddAuthSecurityColumns1773777498454';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_reset_token" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_reset_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "two_factor_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "two_factor_code" character varying(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "two_factor_code_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "two_factor_secret" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "oauth_provider" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "oauth_provider_id" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "oauth_provider_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "oauth_provider"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "two_factor_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "two_factor_code_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "two_factor_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "two_factor_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_reset_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_reset_token"`,
    );
  }
}
