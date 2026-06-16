import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingStatusToChatEnums1774878000002 implements MigrationInterface {
  name = 'AddPendingStatusToChatEnums1774878000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chat_participants_status_enum'
            AND e.enumlabel = 'pending'
        ) THEN
          ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_old";
          CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked');
          ALTER TABLE "chat_participants"
            ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum"
            USING "status"::text::"public"."chat_participants_status_enum";
          DROP TYPE "public"."chat_participants_status_enum_old";
        END IF;

        ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'pending';
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chats_status_enum'
            AND e.enumlabel = 'pending'
        ) THEN
          ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_old";
          CREATE TYPE "public"."chats_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked');
          ALTER TABLE "chats"
            ALTER COLUMN "status" TYPE "public"."chats_status_enum"
            USING "status"::text::"public"."chats_status_enum";
          DROP TYPE "public"."chats_status_enum_old";
        END IF;

        ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'pending';
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chat_participants_status_enum'
            AND e.enumlabel = 'pending'
        ) THEN
          UPDATE "chat_participants" SET "status" = 'active' WHERE "status"::text = 'pending';
          ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_new";
          CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('active', 'archived', 'blocked');
          ALTER TABLE "chat_participants"
            ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum"
            USING "status"::text::"public"."chat_participants_status_enum";
          ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'active';
          DROP TYPE "public"."chat_participants_status_enum_new";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chats_status_enum'
            AND e.enumlabel = 'pending'
        ) THEN
          UPDATE "chats" SET "status" = 'active' WHERE "status"::text = 'pending';
          ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_new";
          CREATE TYPE "public"."chats_status_enum" AS ENUM('active', 'archived', 'blocked');
          ALTER TABLE "chats"
            ALTER COLUMN "status" TYPE "public"."chats_status_enum"
            USING "status"::text::"public"."chats_status_enum";
          ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'active';
          DROP TYPE "public"."chats_status_enum_new";
        END IF;
      END $$;
    `);
  }
}
