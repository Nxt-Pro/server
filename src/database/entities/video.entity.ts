import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Attachment } from './attachment.entity';
import { VideoSkillAnalysis } from './video-skill-analysis.entity';

@Entity('videos')
export class Video {
  @PrimaryColumn('char', { length: 26 })
  id: string;

  @Column('varchar', {
    nullable: true,
    name: 'video_thumbnail_url',
  })
  videoThumbnailUrl?: string | null;

  @Column('integer', {
    nullable: false,
    default: 0,
    name: 'video_duration',
  })
  videoDuration: number;

  @OneToOne(() => Attachment, attachment => attachment.video, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id' })
  attachment: Attachment;

  @OneToOne(() => VideoSkillAnalysis, analysis => analysis.video, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  skillAnalysis?: VideoSkillAnalysis;
}
