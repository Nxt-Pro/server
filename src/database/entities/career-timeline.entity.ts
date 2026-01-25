import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from '.';

@Entity('career_timeline')
@Index(['playerId'])
@Index(['startDate', 'isCurrent'])
export class CareerTimeline extends BaseEntity {
  @Column({ type: 'varchar', length: 26, name: 'player_id' })
  playerId: string;

  @ManyToOne(() => PlayerProfile, profile => profile.career_timeline)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @Column()
  title: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: false, name: 'is_current' })
  isCurrent: boolean;

  @Column({ nullable: true, name: 'evidence_url' })
  evidenceUrl?: string;
}
