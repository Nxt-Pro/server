import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1772890497267 implements MigrationInterface {
  name = 'InitSchema1772890497267';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "career_timeline" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "player_id" character(26) NOT NULL, "title" character varying NOT NULL, "description" text, "start_date" date NOT NULL, "end_date" date, "is_current" boolean NOT NULL DEFAULT false, "evidence_url" character varying, CONSTRAINT "PK_b2fb83c80143c32295903deb6bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29aff303879f0787e6caba894f" ON "career_timeline" ("start_date", "is_current") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8974fd576cc6eb46bc6e289ad" ON "career_timeline" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player_stats" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "player_id" character(26) NOT NULL, "season_year" integer NOT NULL, "goals" integer NOT NULL DEFAULT '0', "assists" integer NOT NULL DEFAULT '0', "matches_played" integer NOT NULL DEFAULT '0', "yellow_cards" integer NOT NULL DEFAULT '0', "red_cards" integer NOT NULL DEFAULT '0', "clean_sheets" integer NOT NULL DEFAULT '0', "avg_rating" numeric(3,2), CONSTRAINT "UQ_ec86df97517c5ea02cdb28b3263" UNIQUE ("player_id", "season_year"), CONSTRAINT "PK_22e2d8ec820a98efbfdbf84d925" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0edcc25b9644a695a09630cd19" ON "player_stats" ("avg_rating") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookmarks_bookmarkable_type_enum" AS ENUM('post', 'player', 'scout', 'event')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookmarks" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying(26) NOT NULL, "bookmarkable_id" character(26) NOT NULL, "bookmarkable_type" "public"."bookmarks_bookmarkable_type_enum" NOT NULL, CONSTRAINT "UQ_6bc030c54a48f96fd543b56a359" UNIQUE ("user_id", "bookmarkable_id", "bookmarkable_type"), CONSTRAINT "PK_7f976ef6cecd37a53bd11685f32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_05b9a8b3b245cebd860c13510b" ON "bookmarks" ("user_id", "bookmarkable_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50230c5a40c417b033cbde6ba7" ON "bookmarks" ("bookmarkable_type", "bookmarkable_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e95a7b766adf15adf40ab140b9" ON "bookmarks" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."media_moderation_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "media_moderation" ("attachment_id" character varying(26) NOT NULL, "status" "public"."media_moderation_status_enum" NOT NULL DEFAULT 'queued', "result" jsonb, "processed_at" TIMESTAMP WITH TIME ZONE, "failure_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76a2d5bd7c6fa14e95298fdb5c8" PRIMARY KEY ("attachment_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a88781c8aae77a68bfeebe25bf" ON "media_moderation" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."video_skill_analysis_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "video_skill_analysis" ("video_id" character(26) NOT NULL, "status" "public"."video_skill_analysis_status_enum" NOT NULL DEFAULT 'queued', "ai_score" jsonb NOT NULL DEFAULT '{}', "analysis_version" character varying(20), "processed_at" TIMESTAMP WITH TIME ZONE, "failure_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ade8e70ad0bc22244447061aebf" PRIMARY KEY ("video_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_367a71a1229f328d5236f14268" ON "video_skill_analysis" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4466de41eb0e1e685f6dbe9e7b" ON "video_skill_analysis" ("analysis_version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "videos" ("id" character varying(26) NOT NULL, "video_thumbnail_url" character varying, "video_duration" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_e4c86c0cf95aff16e9fb8220f6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."attachments_content_type_enum" AS ENUM('image', 'video')`,
    );
    await queryRunner.query(
      `CREATE TABLE "attachments" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "post_id" character varying(26) NOT NULL, "content_type" "public"."attachments_content_type_enum" NOT NULL, "url" character varying NOT NULL, "position" integer NOT NULL, CONSTRAINT "UQ_f825f5e175f7b8798f7014d4452" UNIQUE ("post_id", "position"), CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "likes" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying(26) NOT NULL, "post_id" character varying(26) NOT NULL, CONSTRAINT "UQ_723da61de46f65bb3e3096750d2" UNIQUE ("user_id", "post_id"), CONSTRAINT "PK_a9323de3f8bced7539a794b4a37" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_741df9b9b72f328a6d6f63e79f" ON "likes" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."posts_visibility_enum" AS ENUM('public', 'connections', 'private')`,
    );
    await queryRunner.query(
      `CREATE TABLE "posts" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying(26) NOT NULL, "caption" text, "is_highlight" boolean NOT NULL DEFAULT false, "engagement_score" double precision NOT NULL DEFAULT '0', "likes_count" integer NOT NULL DEFAULT '0', "comments_count" integer NOT NULL DEFAULT '0', "views_count" integer NOT NULL DEFAULT '0', "shares_count" integer NOT NULL DEFAULT '0', "visibility" "public"."posts_visibility_enum" NOT NULL DEFAULT 'public', "is_reported" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d89105adcee0a2752a1e0bb7f" ON "posts" ("visibility", "is_highlight", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45aed3929e9d8b3c269038c999" ON "posts" ("visibility", "engagement_score", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_156fcf8145c4185425e59c15d8" ON "posts" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying(26) NOT NULL, "post_id" character varying(26) NOT NULL, "parent_comment" character varying(26), "content" text NOT NULL, "is_reported" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c675567d2a58f0b07cef09c13" ON "comments" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_62d073f171be238dd4d2157fe2" ON "comments" ("parent_comment", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06a1038b5b8f236c9ddb068af5" ON "comments" ("post_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_favorited_type_enum" AS ENUM('player', 'scout')`,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character varying(26) NOT NULL, "favorited_id" character(26) NOT NULL, "favorited_type" "public"."favorites_favorited_type_enum" NOT NULL, CONSTRAINT "UQ_7414bbb1b4b4be16cae5eab08e0" UNIQUE ("user_id", "favorited_id"), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d07de52f609ed6f7eb653dc3b" ON "favorites" ("favorited_id", "favorited_type") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."scout_profiles_organization_type_enum" AS ENUM('club', 'agency', 'independent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."scout_profiles_verification_status_enum" AS ENUM('pending', 'verified', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "scout_profiles" ("user_id" character varying(26) NOT NULL, "full_name" character varying NOT NULL, "organization" character varying NOT NULL, "organization_type" "public"."scout_profiles_organization_type_enum" NOT NULL, "license_number" character varying, "years_experience" integer, "scouting_positions" text, "countries_covered" text, "bio" text, "profile_picture_url" character varying, "cover_image_url" character varying, "total_notes" integer NOT NULL DEFAULT '0', "verification_status" "public"."scout_profiles_verification_status_enum" NOT NULL DEFAULT 'pending', "verification_documents" jsonb, "profile_completeness" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_703e5b211591dbd666533c7b5b1" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_abbede7f42feb197622be60108" ON "scout_profiles" ("organization_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad95a1568ee08b087bd1a32306" ON "scout_profiles" ("verification_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_703e5b211591dbd666533c7b5b" ON "scout_profiles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('player', 'scout', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'suspended', 'banned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "phone" character varying, "last_active" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d2a85ce8f44a5d621d06db305b" ON "users" ("status", "last_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b20afeaa58143fd22123b7e445" ON "users" ("last_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."player_profiles_preferred_foot_enum" AS ENUM('left', 'right', 'both')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."player_profiles_availability_status_enum" AS ENUM('available', 'trialing', 'contracted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "player_profiles" ("user_id" character varying(26) NOT NULL, "full_name" character varying NOT NULL, "date_of_birth" date NOT NULL, "nationality" character varying, "position" character varying, "secondary_positions" character varying array, "preferred_foot" "public"."player_profiles_preferred_foot_enum", "height_cm" numeric(5,2), "weight_kg" numeric(5,2), "city" character varying, "country" character varying, "club_name" character varying, "availability_status" "public"."player_profiles_availability_status_enum", "bio" text, "profile_picture_url" character varying, "cover_image_url" character varying, "ai_score" numeric(5,2), "total_posts" integer NOT NULL DEFAULT '0', "total_likes" integer NOT NULL DEFAULT '0', "total_views" integer NOT NULL DEFAULT '0', "is_featured" boolean NOT NULL DEFAULT false, "featured_until" TIMESTAMP WITH TIME ZONE, "is_verified" boolean NOT NULL DEFAULT false, "basic_verified_at" TIMESTAMP WITH TIME ZONE, "club_verified_at" TIMESTAMP WITH TIME ZONE, "performance_verified_at" TIMESTAMP WITH TIME ZONE, "profile_completeness" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03f7484ff0d724537b22f741fa3" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f1c2c9af2d59d0485be39eca3" ON "player_profiles" ("position", "availability_status", "ai_score") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0541aeff76bdda93094d974f3b" ON "player_profiles" ("city", "country") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3f0c2ef6c19d3eee9b71698c3" ON "player_profiles" ("club_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da8fb1621819a5dbe15350899b" ON "player_profiles" ("is_verified", "availability_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03f7484ff0d724537b22f741fa" ON "player_profiles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_competition_level_enum" AS ENUM('local', 'regional', 'national', 'international')`,
    );
    await queryRunner.query(
      `CREATE TABLE "achievements" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "player_id" character varying(26) NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "year" integer NOT NULL, "competition_level" "public"."achievements_competition_level_enum" NOT NULL, "verified" boolean NOT NULL DEFAULT false, "evidence_url" character varying, CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7906c30406ec2eeebd4a6429b" ON "achievements" ("player_id", "year") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9dc3fd22e1c7539c98b340004" ON "achievements" ("competition_level") `,
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
      `CREATE TABLE "blocks" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "blocker_id" character varying(26) NOT NULL, "blocked_id" character varying(26) NOT NULL, CONSTRAINT "UQ_806f6a5d38d031cdd868fd5e37e" UNIQUE ("blocker_id", "blocked_id"), CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8aa6c887bed61ad10829450f2f" ON "blocks" ("blocked_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_message_type_enum" AS ENUM('text', 'image', 'file', 'video')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "content" text NOT NULL, "message_type" "public"."messages_message_type_enum" NOT NULL DEFAULT 'text', "attachment_url" text, "read_at" TIMESTAMP WITH TIME ZONE, "chat_id" character varying(26), "sender_id" character varying(26), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_chat_created_at_desc" ON "messages" ("chat_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_read_at" ON "messages" ("read_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_sender_id" ON "messages" ("sender_id") `,
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
      `CREATE INDEX "idx_chats_last_message_at_desc" ON "chats" ("last_message_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chats_scout_id" ON "chats" ("scout_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_participants_status_enum" AS ENUM('active', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_participants" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "unread_count" integer NOT NULL DEFAULT '0', "status" "public"."chat_participants_status_enum" NOT NULL DEFAULT 'active', "chat_id" character varying(26), "user_id" character varying(26), CONSTRAINT "PK_ebf68c52a2b4dceb777672b782d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."connections_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."connections_initiated_by_enum" AS ENUM('player', 'scout')`,
    );
    await queryRunner.query(
      `CREATE TABLE "connections" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "player_id" character varying(26) NOT NULL, "scout_id" character varying(26) NOT NULL, "status" "public"."connections_status_enum" NOT NULL, "initiated_by" "public"."connections_initiated_by_enum" NOT NULL, "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL, "responded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_f6115f1be393c8db164a874226f" UNIQUE ("player_id", "scout_id"), CONSTRAINT "PK_0a1f844af3122354cbd487a8d03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a439d6dd6c0eceb3ccadab1d3" ON "connections" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26e92a56f8d53fa08752230194" ON "connections" ("scout_id") `,
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
      `CREATE INDEX "idx_events_start_date" ON "events" ("start_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_events_organizer_id" ON "events" ("organizer_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."event_registrations_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_registrations" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."event_registrations_status_enum" NOT NULL DEFAULT 'pending', "registered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "cancelled" boolean NOT NULL DEFAULT false, "attended" boolean NOT NULL DEFAULT false, "event_id" character varying(26), "player_id" character varying(26), CONSTRAINT "UQ_9031f1c13e84f085321acbe128f" UNIQUE ("event_id", "player_id"), CONSTRAINT "PK_953d3b862c2487289a92b2356e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_event_registrations_player_created_at_desc" ON "event_registrations" ("player_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_event_registrations_status" ON "event_registrations" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "mutes" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "muter_id" character varying(26) NOT NULL, "muted_id" character varying(26) NOT NULL, CONSTRAINT "UQ_ff8d721183b5ec3c41522956f07" UNIQUE ("muter_id", "muted_id"), CONSTRAINT "PK_844a5927899580f71e88aeaf3a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b578ebb2c35ca3bb5ea08829b" ON "mutes" ("muted_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('like', 'comment', 'message', 'connection_request', 'verification', 'marketing', 'new_event')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "reference_id" character varying, "read_at" TIMESTAMP WITH TIME ZONE, "user_id" character varying(26), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_created_at_desc" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_type" ON "notifications" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_read_at" ON "notifications" ("read_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."player_connections_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "player_connections" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "requester_id" character varying(26) NOT NULL, "addressee_id" character varying(26) NOT NULL, "status" "public"."player_connections_status_enum" NOT NULL, "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL, "responded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_d1b24705fcc657fdd7ba7f1af6b" UNIQUE ("requester_id", "addressee_id"), CONSTRAINT "PK_2f7f91a57e653439618287839d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fef746ffb37bb886eb07f62ee2" ON "player_connections" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_940ad1e6f35e257d63100c60c2" ON "player_connections" ("addressee_id") `,
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
      `CREATE TABLE "scout_notes" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "scout_id" character varying(26) NOT NULL, "player_id" character varying(26) NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "is_private" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_aaf46aa4c0023a9177801a3a768" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_scout_notes_scout_created_at" ON "scout_notes" ("scout_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_scout_notes_scout_player" ON "scout_notes" ("scout_id", "player_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "career_timeline" ADD CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" ADD CONSTRAINT "FK_93f34075933141f2cadabb03eaf" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_moderation" ADD CONSTRAINT "FK_76a2d5bd7c6fa14e95298fdb5c8" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_skill_analysis" ADD CONSTRAINT "FK_ade8e70ad0bc22244447061aebf" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD CONSTRAINT "FK_e4c86c0cf95aff16e9fb8220f6b" FOREIGN KEY ("id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" ADD CONSTRAINT "FK_73cef2ae7c2458df4f3077a7007" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "likes" ADD CONSTRAINT "FK_3f519ed95f775c781a254089171" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "likes" ADD CONSTRAINT "FK_741df9b9b72f328a6d6f63e79ff" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_1b0c4c713e984e4cc0441fa5050" FOREIGN KEY ("parent_comment") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" ADD CONSTRAINT "FK_703e5b211591dbd666533c7b5b1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" ADD CONSTRAINT "FK_03f7484ff0d724537b22f741fa3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_85b2af1dca4083a7b5d0fff977c" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "FK_74f530c6fbffc357047b263818d" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" ADD CONSTRAINT "FK_8aa6c887bed61ad10829450f2f0" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_994726d706d67c0dc722b783da5" FOREIGN KEY ("scout_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_bdbeab3cef1471ae3cad5a17194" FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_b4129b3e21906ca57b503a1d834" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connections" ADD CONSTRAINT "FK_984bdcbfb85c1014ebf6f0efee5" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "connections" ADD CONSTRAINT "FK_26e92a56f8d53fa087522301946" FOREIGN KEY ("scout_id") REFERENCES "scout_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
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
      `ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_28b0a253c87a80a4b013c437f7d" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" ADD CONSTRAINT "FK_f885873bd3c3c54a3c2b556aa38" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mutes" ADD CONSTRAINT "FK_9ad4d46d1770bdb681b11cdc131" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mutes" ADD CONSTRAINT "FK_6b578ebb2c35ca3bb5ea08829b2" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_4abdef4e14974bee71bb94e6ede" FOREIGN KEY ("requester_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_940ad1e6f35e257d63100c60c2d" FOREIGN KEY ("addressee_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_580adb3369c061e2f3cd20e7442" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_notes" ADD CONSTRAINT "FK_06b04f36cabde9af8a71d3c70d2" FOREIGN KEY ("scout_id") REFERENCES "scout_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_notes" ADD CONSTRAINT "FK_3cab6217e7fec2e1cac9688a463" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scout_notes" DROP CONSTRAINT "FK_3cab6217e7fec2e1cac9688a463"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_notes" DROP CONSTRAINT "FK_06b04f36cabde9af8a71d3c70d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_580adb3369c061e2f3cd20e7442"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_940ad1e6f35e257d63100c60c2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_4abdef4e14974bee71bb94e6ede"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mutes" DROP CONSTRAINT "FK_6b578ebb2c35ca3bb5ea08829b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mutes" DROP CONSTRAINT "FK_9ad4d46d1770bdb681b11cdc131"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_f885873bd3c3c54a3c2b556aa38"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registrations" DROP CONSTRAINT "FK_28b0a253c87a80a4b013c437f7d"`,
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
      `ALTER TABLE "connections" DROP CONSTRAINT "FK_26e92a56f8d53fa087522301946"`,
    );
    await queryRunner.query(
      `ALTER TABLE "connections" DROP CONSTRAINT "FK_984bdcbfb85c1014ebf6f0efee5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_b4129b3e21906ca57b503a1d834"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_9946d299e9ccfbee23aa40c5545"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_bdbeab3cef1471ae3cad5a17194"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_994726d706d67c0dc722b783da5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" DROP CONSTRAINT "FK_8aa6c887bed61ad10829450f2f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blocks" DROP CONSTRAINT "FK_74f530c6fbffc357047b263818d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_177183f29f438c488b5e8510cdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_85b2af1dca4083a7b5d0fff977c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" DROP CONSTRAINT "FK_03f7484ff0d724537b22f741fa3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" DROP CONSTRAINT "FK_703e5b211591dbd666533c7b5b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_1b0c4c713e984e4cc0441fa5050"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986"`,
    );
    await queryRunner.query(
      `ALTER TABLE "likes" DROP CONSTRAINT "FK_741df9b9b72f328a6d6f63e79ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "likes" DROP CONSTRAINT "FK_3f519ed95f775c781a254089171"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" DROP CONSTRAINT "FK_73cef2ae7c2458df4f3077a7007"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" DROP CONSTRAINT "FK_e4c86c0cf95aff16e9fb8220f6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_skill_analysis" DROP CONSTRAINT "FK_ade8e70ad0bc22244447061aebf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_moderation" DROP CONSTRAINT "FK_76a2d5bd7c6fa14e95298fdb5c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" DROP CONSTRAINT "FK_93f34075933141f2cadabb03eaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_timeline" DROP CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_scout_notes_scout_player"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_scout_notes_scout_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "scout_notes"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reports_reported_type_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_reports_status"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_severity_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_940ad1e6f35e257d63100c60c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fef746ffb37bb886eb07f62ee2"`,
    );
    await queryRunner.query(`DROP TABLE "player_connections"`);
    await queryRunner.query(
      `DROP TYPE "public"."player_connections_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_read_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_created_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b578ebb2c35ca3bb5ea08829b"`,
    );
    await queryRunner.query(`DROP TABLE "mutes"`);
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
    await queryRunner.query(`DROP INDEX "public"."idx_events_organizer_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_events_start_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_events_status_start_date_desc"`,
    );
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "public"."events_organizer_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."events_event_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_venues_city_country"`);
    await queryRunner.query(`DROP INDEX "public"."idx_venues_name"`);
    await queryRunner.query(`DROP TABLE "venues"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26e92a56f8d53fa08752230194"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a439d6dd6c0eceb3ccadab1d3"`,
    );
    await queryRunner.query(`DROP TABLE "connections"`);
    await queryRunner.query(
      `DROP TYPE "public"."connections_initiated_by_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."connections_status_enum"`);
    await queryRunner.query(`DROP TABLE "chat_participants"`);
    await queryRunner.query(
      `DROP TYPE "public"."chat_participants_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_chats_scout_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_chats_last_message_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "chats"`);
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_messages_read_at"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_messages_chat_created_at_desc"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_message_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8aa6c887bed61ad10829450f2f"`,
    );
    await queryRunner.query(`DROP TABLE "blocks"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_actor_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_entity_id"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9dc3fd22e1c7539c98b340004"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7906c30406ec2eeebd4a6429b"`,
    );
    await queryRunner.query(`DROP TABLE "achievements"`);
    await queryRunner.query(
      `DROP TYPE "public"."achievements_competition_level_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03f7484ff0d724537b22f741fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da8fb1621819a5dbe15350899b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3f0c2ef6c19d3eee9b71698c3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0541aeff76bdda93094d974f3b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f1c2c9af2d59d0485be39eca3"`,
    );
    await queryRunner.query(`DROP TABLE "player_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."player_profiles_availability_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."player_profiles_preferred_foot_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b20afeaa58143fd22123b7e445"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d2a85ce8f44a5d621d06db305b"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_703e5b211591dbd666533c7b5b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad95a1568ee08b087bd1a32306"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_abbede7f42feb197622be60108"`,
    );
    await queryRunner.query(`DROP TABLE "scout_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."scout_profiles_verification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."scout_profiles_organization_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d07de52f609ed6f7eb653dc3b"`,
    );
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(
      `DROP TYPE "public"."favorites_favorited_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_06a1038b5b8f236c9ddb068af5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_62d073f171be238dd4d2157fe2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c675567d2a58f0b07cef09c13"`,
    );
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_156fcf8145c4185425e59c15d8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_45aed3929e9d8b3c269038c999"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d89105adcee0a2752a1e0bb7f"`,
    );
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TYPE "public"."posts_visibility_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_741df9b9b72f328a6d6f63e79f"`,
    );
    await queryRunner.query(`DROP TABLE "likes"`);
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(
      `DROP TYPE "public"."attachments_content_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "videos"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4466de41eb0e1e685f6dbe9e7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_367a71a1229f328d5236f14268"`,
    );
    await queryRunner.query(`DROP TABLE "video_skill_analysis"`);
    await queryRunner.query(
      `DROP TYPE "public"."video_skill_analysis_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a88781c8aae77a68bfeebe25bf"`,
    );
    await queryRunner.query(`DROP TABLE "media_moderation"`);
    await queryRunner.query(
      `DROP TYPE "public"."media_moderation_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e95a7b766adf15adf40ab140b9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50230c5a40c417b033cbde6ba7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_05b9a8b3b245cebd860c13510b"`,
    );
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(
      `DROP TYPE "public"."bookmarks_bookmarkable_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0edcc25b9644a695a09630cd19"`,
    );
    await queryRunner.query(`DROP TABLE "player_stats"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8974fd576cc6eb46bc6e289ad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29aff303879f0787e6caba894f"`,
    );
    await queryRunner.query(`DROP TABLE "career_timeline"`);
  }
}
