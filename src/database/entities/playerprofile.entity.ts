import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CareerTimeline, PlayerStats } from './playerhistory.entity';
import { User } from './user.entity';

@Entity('player_profiles')
export class PlayerProfile extends BaseEntity {
  @OneToOne(() => User, user => user.playerProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  full_name: string;

  @Column({ type: 'date' })
  date_of_birth: Date;

  @Column({ type: 'simple-array', nullable: true })
  secondary_positions: string[];

  // --- Verification Flags & Timestamps ---
  @Column({ default: false })
  is_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  basic_verified_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  club_verified_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  performance_verified_at: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ai_score: number;

  // --- Relations ---
  @OneToMany(() => PlayerStats, stats => stats.player)
  stats: PlayerStats[];

  @OneToMany(() => CareerTimeline, timeline => timeline.player)
  career_timeline: CareerTimeline[];
}
