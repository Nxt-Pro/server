import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('career_timeline')
export class CareerTimeline extends BaseEntity {
  @ManyToOne(() => PlayerProfile, profile => profile.career_timeline)
  player: PlayerProfile;

  @Column()
  title: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: false })
  is_current: boolean;

  @Column({ nullable: true })
  evidence_url?: string;
}
