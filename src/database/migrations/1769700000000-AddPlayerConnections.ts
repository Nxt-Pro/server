import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerConnections1769700000000 implements MigrationInterface {
  name = 'AddPlayerConnections1769700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."player_connections_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "player_connections" (
        "id" character varying(26) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "requester_id" character varying(26) NOT NULL,
        "addressee_id" character varying(26) NOT NULL,
        "status" "public"."player_connections_status_enum" NOT NULL,
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "responded_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_player_connections_requester_addressee" UNIQUE ("requester_id", "addressee_id"),
        CONSTRAINT "PK_player_connections" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_connections_addressee" ON "player_connections" ("addressee_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_connections_status" ON "player_connections" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_player_connections_requester" FOREIGN KEY ("requester_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" ADD CONSTRAINT "FK_player_connections_addressee" FOREIGN KEY ("addressee_id") REFERENCES "player_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_player_connections_addressee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_connections" DROP CONSTRAINT "FK_player_connections_requester"`,
    );
    await queryRunner.query(`DROP TABLE "player_connections"`);
    await queryRunner.query(
      `DROP TYPE "public"."player_connections_status_enum"`,
    );
  }
}
