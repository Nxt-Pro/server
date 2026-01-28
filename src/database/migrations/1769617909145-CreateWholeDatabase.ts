import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWholeDatabase1769617909145 implements MigrationInterface {
  name = 'CreateWholeDatabase1769617909145';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."event_registrations_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_registrations" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."event_registrations_status_enum" NOT NULL DEFAULT 'pending', "registered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "cancelled" boolean NOT NULL DEFAULT false, "attended" boolean NOT NULL DEFAULT false, "event_id" character varying(26), "player_id" character varying(26), CONSTRAINT "UQ_9031f1c13e84f085321acbe128f" UNIQUE ("event_id", "player_id"), CONSTRAINT "PK_953d3b862c2487289a92b2356e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_event_registrations_player_created_at_desc" ON "event_registrations" ("player_id", "created_at" DESC) `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_event_registrations_status" ON "event_registrations" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_event_type_enum" AS ENUM('tournament', 'trial', 'workshop')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_status_enum" AS ENUM('pending_approval', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."events_organizer_type_enum" AS ENUM('scout', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text NOT NULL, "event_type" "public"."events_event_type_enum" NOT NULL, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME, "status" "public"."events_status_enum" NOT NULL DEFAULT 'pending_approval', "organizer_type" "public"."events_organizer_type_enum" NOT NULL, "approved_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "positions_targeted" text array, "tags" text array, "max_participants" integer NOT NULL DEFAULT '0', "participant_count" integer NOT NULL DEFAULT '0', "registration_deadline" TIMESTAMP WITH TIME ZONE, "entry_fee" numeric, "schedule" jsonb, "prizes" jsonb, "requirements" jsonb, "cover_image_url" text, "organizer_id" character varying(26), "created_by_id" character varying(26), "approved_by_id" character varying(26), "venue_id" character varying(26), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_events_status_start_date_desc" ON "events" ("status", "start_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_events_start_date" ON "events" ("start_date" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_events_organizer_id" ON "events" ("organizer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "venues" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "address" character varying NOT NULL, "city" character varying, "country" character varying, "capacity" integer, "contact_phone" character varying, "contact_email" character varying, "images" text array, CONSTRAINT "PK_cb0f885278d12384eb7a81818be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_venues_name" ON "venues" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_venues_city_country" ON "venues" ("city", "country") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_type_enum" AS ENUM('user', 'event', 'message', 'content', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('pending', 'under_review', 'resolved', 'dismissed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_severity_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" "public"."reports_type_enum" NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'pending', "severity" "public"."reports_severity_enum" NOT NULL DEFAULT 'medium', "reported_type" character varying NOT NULL, "reported_id" character varying NOT NULL, "resolution_notes" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, "reporter_id" character varying(26), "resolved_by_id" character varying(26), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reports_status" ON "reports" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reports_reported_type_id" ON "reports" ("reported_type", "reported_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('like', 'comment', 'message', 'connection_request', 'verification', 'marketing', 'new_event')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "reference_id" character varying, "read_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_created_at_desc" ON "notifications" ("user_id", "created_at" DESC) `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_type" ON "notifications" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_read_at" ON "notifications" ("read_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_participants" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "unread_count" integer NOT NULL DEFAULT '0', "status" "public"."chat_participants_status_enum" NOT NULL DEFAULT 'active', "chat_id" character varying(26), "user_id" character varying(26), CONSTRAINT "PK_ebf68c52a2b4dceb777672b782d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum" AS ENUM('direct', 'group')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_status_enum" AS ENUM('active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chats" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" "public"."chats_type_enum" NOT NULL DEFAULT 'direct', "status" "public"."chats_status_enum" NOT NULL DEFAULT 'active', "unread_count" integer NOT NULL DEFAULT '0', "last_message_at" TIMESTAMP WITH TIME ZONE, "last_message_preview" text, "name" character varying, "scout_id" character varying(26), "player_id" character varying(26), CONSTRAINT "UQ_fd2223ea7b15ed0e020dae8e37e" UNIQUE ("player_id", "scout_id"), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chats_last_message_at_desc" ON "chats" ("last_message_at" DESC) `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chats_scout_id" ON "chats" ("scout_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('text', 'image', 'file', 'video')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "content" text NOT NULL, "message_type" "public"."messages_message_type_enum" NOT NULL DEFAULT 'text', "attachment_url" text, "read_at" TIMESTAMP WITH TIME ZONE, "chat_id" character varying(26), "sender_id" character varying(26), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_chat_created_at_desc" ON "messages" ("chat_id", "created_at" DESC) `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_read_at" ON "messages" ("read_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_sender_id" ON "messages" ("sender_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('user_created', 'user_updated', 'user_banned', 'user_suspended', 'user_verified', 'user_status_changed', 'event_created', 'event_updated', 'event_deleted', 'event_approved', 'event_rejected', 'event_status_changed', 'registration_approved', 'registration_rejected', 'registration_cancelled', 'report_created', 'report_resolved', 'report_dismissed', 'admin_action', 'system_event')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "action" "public"."audit_logs_action_enum" NOT NULL, "entity_type" character varying NOT NULL, "entity_id" character varying NOT NULL, "description" text, "old_status" character varying, "new_status" character varying, "metadata" jsonb, "ip_address" character varying, "user_agent" character varying, "actor_id" character varying(26), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs" ("entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_actor_id" ON "audit_logs" ("actor_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_28b0a253c87a80a4b013c437f7d" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_f885873bd3c3c54a3c2b556aa38" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_14c9ce53a2c2a1c781b8390123e" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_08e606dc5182b142dc916e7abab" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_093df723b3ead5fbf8b33aa4ff8" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_26e10dc1ae5cdd5a20279e08b4a" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_580adb3369c061e2f3cd20e7442" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_b4129b3e21906ca57b503a1d834" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_994726d706d67c0dc722b783da5" FOREIGN KEY ("scout_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_bdbeab3cef1471ae3cad5a17194" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_177183f29f438c488b5e8510cdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_bdbeab3cef1471ae3cad5a17194"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_994726d706d67c0dc722b783da5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_b4129b3e21906ca57b503a1d834"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_580adb3369c061e2f3cd20e7442"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_26e10dc1ae5cdd5a20279e08b4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_093df723b3ead5fbf8b33aa4ff8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_08e606dc5182b142dc916e7abab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_14c9ce53a2c2a1c781b8390123e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_f885873bd3c3c54a3c2b556aa38"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_28b0a253c87a80a4b013c437f7d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_actor_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_entity_id"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_read_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_messages_chat_created_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_message_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_chats_scout_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_chats_last_message_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "chats"`);
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
    await queryRunner.query(`DROP TABLE "chat_participants"`);
    await queryRunner.query(
      `DROP TYPE "public"."chat_participants_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_read_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_created_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reports_reported_type_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_reports_status"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_venues_city_country"`);
    await queryRunner.query(`DROP INDEX "public"."idx_venues_name"`);
    await queryRunner.query(`DROP TABLE "venues"`);
    await queryRunner.query(`DROP INDEX "public"."idx_events_organizer_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_events_start_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_events_status_start_date_desc"`,
    );
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "public"."events_organizer_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_event_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_event_registrations_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_event_registrations_player_created_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "event_registrations"`);
    await queryRunner.query(
      `DROP TYPE "public"."event_registrations_status_enum"`,
    );
  }
}
