import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverImageToProfiles1772879433588 implements MigrationInterface {
  name = 'AddCoverImageToProfiles1772879433588';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `ALTER TABLE "player_profiles" ADD "cover_image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" ADD "cover_image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_4abdef4e14974bee71bb94e6ede" FOREIGN KEY ("requester_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_940ad1e6f35e257d63100c60c2d" FOREIGN KEY ("addressee_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_940ad1e6f35e257d63100c60c2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_4abdef4e14974bee71bb94e6ede"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scout_profiles" DROP COLUMN "cover_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_profiles" DROP COLUMN "cover_image_url"`,
    );
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
  }
}
