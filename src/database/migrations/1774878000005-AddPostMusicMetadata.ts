import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostMusicMetadata1774878000005 implements MigrationInterface {
  name = 'AddPostMusicMetadata1774878000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD "music_url" character varying(2048)
    `);
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD "music_title" character varying(160)
    `);
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD "music_artist" character varying(160)
    `);
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD "music_duration_ms" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN "music_duration_ms"
    `);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN "music_artist"
    `);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN "music_title"
    `);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN "music_url"
    `);
  }
}
