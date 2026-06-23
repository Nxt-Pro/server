import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatAndNotificationPreferences1774878000004 implements MigrationInterface {
  name = 'AddChatAndNotificationPreferences1774878000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_notification_preferences" (
        "id" character varying(26) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" character varying(26),
        "in_app_notifications" boolean NOT NULL DEFAULT true,
        "email_notifications" boolean NOT NULL DEFAULT true,
        "chat_requests" boolean NOT NULL DEFAULT true,
        "chat_messages" boolean NOT NULL DEFAULT true,
        "chat_accepted" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_user_notification_preferences_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_notification_preferences_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_user_notification_preferences_user_id"
      ON "user_notification_preferences" ("user_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      ADD CONSTRAINT "FK_user_notification_preferences_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
      ADD "notifications_muted" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
      ADD "cleared_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants" DROP COLUMN "cleared_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants" DROP COLUMN "notifications_muted"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_notification_preferences"
      DROP CONSTRAINT "FK_user_notification_preferences_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."idx_user_notification_preferences_user_id"
    `);
    await queryRunner.query(`DROP TABLE "user_notification_preferences"`);
  }
}
