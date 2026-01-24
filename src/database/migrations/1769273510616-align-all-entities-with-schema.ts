import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignAllEntitiesWithSchema1769273510616 implements MigrationInterface {
  name = 'AlignAllEntitiesWithSchema1769273510616';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."player_profiles_availability_status_enum" AS ENUM('available', 'trialing', 'contracted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."player_profiles_preferred_foot_enum" AS ENUM('left', 'right', 'both')`,
    );
    await queryRunner.query(
      `CREATE TABLE "player_profiles" ("user_id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "full_name" character varying NOT NULL, "date_of_birth" date NOT NULL, "position" character varying, "height_cm" numeric(5,2), "weight_kg" numeric(5,2), "nationality" character varying, "city" character varying, "country" character varying, "bio" text, "profile_picture_url" character varying, "secondary_positions" text, "availability_status" "public"."player_profiles_availability_status_enum", "club_name" character varying, "preferred_foot" "public"."player_profiles_preferred_foot_enum", "total_posts" integer NOT NULL DEFAULT '0', "total_likes" integer NOT NULL DEFAULT '0', "total_views" integer NOT NULL DEFAULT '0', "is_featured" boolean NOT NULL DEFAULT false, "featured_until" TIMESTAMP, "profile_completeness" numeric(5,2) NOT NULL DEFAULT '0', "is_verified" boolean NOT NULL DEFAULT false, "basic_verified_at" TIMESTAMP, "club_verified_at" TIMESTAMP, "performance_verified_at" TIMESTAMP, "ai_score" numeric(5,2), CONSTRAINT "PK_03f7484ff0d724537b22f741fa3" PRIMARY KEY ("user_id"))`,
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
      `CREATE TABLE "achievements" ("player_id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text NOT NULL, "year" integer NOT NULL, "competition_level" "public"."achievements_competition_level_enum" NOT NULL, "evidence_url" character varying, "verified" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_85b2af1dca4083a7b5d0fff977c" PRIMARY KEY ("player_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9dc3fd22e1c7539c98b340004" ON "achievements" ("competition_level") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa518400ff1b67c70dd5d1476f" ON "achievements" ("year") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_85b2af1dca4083a7b5d0fff977" ON "achievements" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "career_timeline" ("player_id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "start_date" date NOT NULL, "end_date" date, "description" text, "is_current" boolean NOT NULL DEFAULT false, "evidence_url" character varying, CONSTRAINT "PK_d8974fd576cc6eb46bc6e289ada" PRIMARY KEY ("player_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29aff303879f0787e6caba894f" ON "career_timeline" ("start_date", "is_current") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8974fd576cc6eb46bc6e289ad" ON "career_timeline" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player_stats" ("player_id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "goals" integer NOT NULL, "assists" integer NOT NULL, "season_year" integer NOT NULL, "matches_played" integer NOT NULL DEFAULT '0', "yellow_cards" integer NOT NULL DEFAULT '0', "red_cards" integer NOT NULL DEFAULT '0', "clean_sheets" integer NOT NULL DEFAULT '0', "avg_rating" numeric(3,2), CONSTRAINT "PK_93f34075933141f2cadabb03eaf" PRIMARY KEY ("player_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0edcc25b9644a695a09630cd19" ON "player_stats" ("avg_rating") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec86df97517c5ea02cdb28b326" ON "player_stats" ("player_id", "season_year") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('player', 'scout', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'suspended', 'banned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "phone" character varying, "last_active" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
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
      `CREATE TYPE "public"."scout_profiles_organization_type_enum" AS ENUM('club', 'agency', 'independent')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."scout_profiles_verification_status_enum" AS ENUM('pending', 'verified', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "scout_profiles" ("user_id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "full_name" character varying NOT NULL, "organization" character varying NOT NULL, "organization_type" "public"."scout_profiles_organization_type_enum" NOT NULL, "license_number" character varying, "scouting_positions" text, "years_experience" integer, "countries_covered" text, "bio" text, "profile_picture_url" character varying, "total_notes" integer NOT NULL DEFAULT '0', "verification_status" "public"."scout_profiles_verification_status_enum" NOT NULL DEFAULT 'pending', "verification_documents" jsonb, "profile_completeness" numeric(5,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_703e5b211591dbd666533c7b5b1" PRIMARY KEY ("user_id"))`,
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
      `CREATE TABLE "test" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "age" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5417af0062cf987495b611b59c7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" ADD CONSTRAINT "FK_03f7484ff0d724537b22f741fa3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_85b2af1dca4083a7b5d0fff977c" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_timeline" ADD CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" ADD CONSTRAINT "FK_93f34075933141f2cadabb03eaf" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" ADD CONSTRAINT "FK_703e5b211591dbd666533c7b5b1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" DROP CONSTRAINT "FK_703e5b211591dbd666533c7b5b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" DROP CONSTRAINT "FK_93f34075933141f2cadabb03eaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_timeline" DROP CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_85b2af1dca4083a7b5d0fff977c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" DROP CONSTRAINT "FK_03f7484ff0d724537b22f741fa3"`,
    );
    await queryRunner.query(`DROP TABLE "test"`);
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
      `DROP INDEX "public"."IDX_ec86df97517c5ea02cdb28b326"`,
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_85b2af1dca4083a7b5d0fff977"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa518400ff1b67c70dd5d1476f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9dc3fd22e1c7539c98b340004"`,
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
      `DROP TYPE "public"."player_profiles_preferred_foot_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."player_profiles_availability_status_enum"`,
    );
  }
}
