import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenNotificationDelivery1774878000009 implements MigrationInterface {
  name = 'HardenNotificationDelivery1774878000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const notificationTypes = [
      'chat_request',
      'chat_message',
      'chat_accepted',
      'connection_accepted',
      'connection_rejected',
      'post_like',
      'post_comment',
      'post_share',
      'event_created',
      'event_updated',
      'event_registration',
      'verification_status',
      'report_status',
      'admin_action',
      'system',
    ];

    for (const type of notificationTypes) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'notifications_type_enum'
              AND e.enumlabel = '${type}'
          ) THEN
            ALTER TYPE "public"."notifications_type_enum" ADD VALUE '${type}';
          END IF;
        END $$;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD "reference_type" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD "data" jsonb
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_reference"
      ON "notifications" ("reference_type", "reference_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_dedupe_key"
      ON "notifications" ((data->>'dedupeKey'))
      WHERE data ? 'dedupeKey'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_dedupe_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_reference"`,
    );
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "data"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "reference_type"`,
    );

    await queryRunner.query(`
      UPDATE "notifications"
      SET "type" = CASE
        WHEN "type"::text IN ('chat_request', 'chat_message', 'chat_accepted') THEN 'message'
        WHEN "type"::text IN ('connection_accepted', 'connection_rejected') THEN 'connection_request'
        WHEN "type"::text = 'post_like' THEN 'like'
        WHEN "type"::text = 'post_comment' THEN 'comment'
        WHEN "type"::text IN ('post_share', 'report_status', 'admin_action', 'system') THEN 'marketing'
        WHEN "type"::text IN ('event_created', 'event_updated', 'event_registration') THEN 'new_event'
        WHEN "type"::text = 'verification_status' THEN 'verification'
        ELSE "type"::text
      END::"public"."notifications_type_enum"
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_new"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum"
      AS ENUM('like', 'comment', 'message', 'connection_request', 'verification', 'marketing', 'new_event', 'skill_score')
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type" TYPE "public"."notifications_type_enum"
      USING "type"::text::"public"."notifications_type_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_new"`);
  }
}
