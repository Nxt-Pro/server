import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PlayerProfile } from '.';

@Entity('career_timeline')
@Index(['player_id'])
@Index(['start_date', 'is_current'])
export class CareerTimeline {
  @ManyToOne(() => PlayerProfile, profile => profile.career_timeline)
  @PrimaryColumn('char', { length: 26 })
  player_id: string;

  @JoinColumn({ name: 'player_id' })
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
