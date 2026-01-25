import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from '.';

@Entity('career_timeline')
@Index(['playerId'])
@Index(['startDate', 'isCurrent'])
export class CareerTimeline extends BaseEntity {
  // --- Foreign Key ---
  @Column({ type: 'varchar', length: 26, name: 'player_id' })
  playerId: string;

  // --- Event Info ---
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // --- Timeline ---
  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: Date;

  @Column({ default: false, name: 'is_current' })
  isCurrent: boolean;

  // --- Verification ---
  @Column({ nullable: true, name: 'evidence_url' })
  evidenceUrl?: string;

  // --- Relations ---
  @ManyToOne(() => PlayerProfile, profile => profile.careerTimeline)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;
  // createdAt & updatedAt inherited from BaseEntity
}
