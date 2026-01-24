import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserColumns1769265602354 implements MigrationInterface {
  name = 'AddUserColumns1769265602354';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "player_profiles" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "full_name" character varying NOT NULL, "date_of_birth" date NOT NULL, "secondary_positions" text, "is_verified" boolean NOT NULL DEFAULT false, "basic_verified_at" TIMESTAMP, "club_verified_at" TIMESTAMP, "performance_verified_at" TIMESTAMP, "ai_score" numeric(5,2), "user_id" character varying(26), CONSTRAINT "REL_03f7484ff0d724537b22f741fa" UNIQUE ("user_id"), CONSTRAINT "PK_60488bbe49c4612fce78e0a1875" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "player_stats" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "goals" integer NOT NULL, "assists" integer NOT NULL, "season_year" integer NOT NULL, "player_id" character varying(26), CONSTRAINT "PK_22e2d8ec820a98efbfdbf84d925" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "career_timeline" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "start_date" date NOT NULL, "player_id" character varying(26), CONSTRAINT "PK_b2fb83c80143c32295903deb6bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."scout_profiles_verification_status_enum" AS ENUM('pending', 'verified', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "scout_profiles" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization" character varying NOT NULL, "verification_status" "public"."scout_profiles_verification_status_enum" NOT NULL DEFAULT 'pending', "user_id" character varying(26), CONSTRAINT "REL_703e5b211591dbd666533c7b5b" UNIQUE ("user_id"), CONSTRAINT "PK_62acd3547340ab8ef922e1bfd0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "test" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "age" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5417af0062cf987495b611b59c7" PRIMARY KEY ("id"))`,
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
      `ALTER TABLE "player_profiles" ADD CONSTRAINT "FK_03f7484ff0d724537b22f741fa3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" ADD CONSTRAINT "FK_93f34075933141f2cadabb03eaf" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_timeline" ADD CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada" FOREIGN KEY ("player_id") REFERENCES "player_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "career_timeline" DROP CONSTRAINT "FK_d8974fd576cc6eb46bc6e289ada"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_stats" DROP CONSTRAINT "FK_93f34075933141f2cadabb03eaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" DROP CONSTRAINT "FK_03f7484ff0d724537b22f741fa3"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "test"`);
    await queryRunner.query(`DROP TABLE "scout_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."scout_profiles_verification_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "career_timeline"`);
    await queryRunner.query(`DROP TABLE "player_stats"`);
    await queryRunner.query(`DROP TABLE "player_profiles"`);
  }
}
