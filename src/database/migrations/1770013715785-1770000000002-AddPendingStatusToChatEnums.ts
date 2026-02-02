import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingStatusToChatEnums1770013715785 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum" USING "status"::text::"public"."chat_participants_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."chat_participants_status_enum_old"`,
    );

    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" TYPE "public"."chats_status_enum" USING "status"::text::"public"."chats_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "chat_participants" SET "status" = 'active' WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum" USING "status"::text::"public"."chat_participants_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."chat_participants_status_enum_new"`,
    );

    await queryRunner.query(
      `UPDATE "chats" SET "status" = 'active' WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_status_enum" AS ENUM('active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" TYPE "public"."chats_status_enum" USING "status"::text::"public"."chats_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum_new"`);
  }
}
