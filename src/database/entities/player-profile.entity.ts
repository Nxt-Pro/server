import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity, CareerTimeline, PlayerStats, User } from '.';

@Entity('player_profiles')
export class PlayerProfile extends BaseEntity {
  @OneToOne(() => User, user => user.playerProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  full_name: string;

  @Column({ type: 'date' })
  date_of_birth: Date;

  @Column({ nullable: true })
  position?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height_cm?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight_kg?: number;

  @Column({ nullable: true })
  nationality?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  profile_picture_url?: string;

  @Column({ type: 'simple-array', nullable: true })
  secondary_positions: string[];

  @Column({
    type: 'enum',
    enum: ['available', 'unavailable', 'open_to_offers'],
    nullable: true,
  })
  availability_status?: 'available' | 'unavailable' | 'open_to_offers';

  @Column({ nullable: true })
  club_name?: string;

  @Column({ type: 'enum', enum: ['left', 'right', 'both'], nullable: true })
  preferred_foot?: 'left' | 'right' | 'both';

  @Column({ type: 'int', default: 0 })
  total_posts: number;

  @Column({ type: 'int', default: 0 })
  total_likes: number;

  @Column({ type: 'int', default: 0 })
  total_views: number;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ type: 'timestamp', nullable: true })
  featured_until?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  profile_completeness: number;

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
