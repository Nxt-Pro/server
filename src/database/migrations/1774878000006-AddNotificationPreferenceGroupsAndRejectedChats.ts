import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferenceGroupsAndRejectedChats1774878000006 implements MigrationInterface {
  name = 'AddNotificationPreferenceGroupsAndRejectedChats1774878000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      ADD "connections" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      ADD "post_engagement" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      ADD "event_updates" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      ADD "verification_updates" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chat_participants_status_enum'
            AND e.enumlabel = 'rejected'
        ) THEN
          ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_old";
          CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked', 'rejected');
          ALTER TABLE "chat_participants"
            ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum"
            USING "status"::text::"public"."chat_participants_status_enum";
          ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'pending';
          DROP TYPE "public"."chat_participants_status_enum_old";
        END IF;
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
            AND e.enumlabel = 'rejected'
        ) THEN
          ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT;
          ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_old";
          CREATE TYPE "public"."chats_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked', 'rejected');
          ALTER TABLE "chats"
            ALTER COLUMN "status" TYPE "public"."chats_status_enum"
            USING "status"::text::"public"."chats_status_enum";
          ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'pending';
          DROP TYPE "public"."chats_status_enum_old";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "chat_participants"
      SET "status" = 'archived'
      WHERE "status"::text = 'rejected'
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."chat_participants_status_enum" RENAME TO "chat_participants_status_enum_new"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked')
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
        ALTER COLUMN "status" TYPE "public"."chat_participants_status_enum"
        USING "status"::text::"public"."chat_participants_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants" ALTER COLUMN "status" SET DEFAULT 'pending'
    `);
    await queryRunner.query(`
      DROP TYPE "public"."chat_participants_status_enum_new"
    `);

    await queryRunner.query(`
      UPDATE "chats"
      SET "status" = 'archived'
      WHERE "status"::text = 'rejected'
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."chats_status_enum" RENAME TO "chats_status_enum_new"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."chats_status_enum" AS ENUM('pending', 'active', 'archived', 'blocked')
    `);
    await queryRunner.query(`
      ALTER TABLE "chats"
        ALTER COLUMN "status" TYPE "public"."chats_status_enum"
        USING "status"::text::"public"."chats_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" ALTER COLUMN "status" SET DEFAULT 'pending'
    `);
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum_new"`);

    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences" DROP COLUMN "verification_updates"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences" DROP COLUMN "event_updates"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences" DROP COLUMN "post_engagement"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences" DROP COLUMN "connections"
    `);
  }
}
