import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Achievement } from './achievement.entity';
import { CareerTimeline } from './career-timeline.entity';
import { PlayerStats } from './player-stats.entity';
import { User } from './user.entity';

@Entity('player_profiles')
@Index(['userId'])
@Index(['isVerified', 'availabilityStatus'])
@Index(['clubName'])
@Index(['city', 'country'])
@Index(['position', 'availabilityStatus', 'aiScore'])
export class PlayerProfile {
  // --- Primary Key & Foreign Key ---
  @PrimaryColumn('char', { length: 26, name: 'user_id' })
  userId: string;

  // --- Basic Info ---
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'date', name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column({ nullable: true })
  nationality?: string;

  // --- Physical Attributes ---
  @Column({ nullable: true })
  position?: string;

  @Column({
    type: 'varchar',
    array: true,
    nullable: true,
    name: 'secondary_positions',
  })
  secondaryPositions?: string[];

  @Column({
    type: 'enum',
    enum: ['left', 'right', 'both'],
    nullable: true,
    name: 'preferred_foot',
  })
  preferredFoot?: 'left' | 'right' | 'both';

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'height_cm',
  })
  heightCm?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'weight_kg',
  })
  weightKg?: number;

  // --- Location ---
  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  // --- Career & Club ---
  @Column({ nullable: true, name: 'club_name' })
  clubName?: string;

  @Column({
    type: 'enum',
    enum: ['available', 'trialing', 'contracted'],
    nullable: true,
    name: 'availability_status',
  })
  availabilityStatus?: 'available' | 'trialing' | 'contracted';

  // --- Profile & Media ---
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true, name: 'profile_picture_url' })
  profilePictureUrl?: string;

  @Column({ nullable: true, name: 'cover_image_url' })
  coverImageUrl?: string;

  // --- Performance Metrics ---
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'ai_score',
  })
  aiScore?: number;

  @Column('jsonb', {
    nullable: false,
    default: {},
    name: 'skill_scores',
  })
  skillScores: Record<string, number>;

  // --- Engagement & Visibility ---
  @Column({ type: 'int', default: 0, name: 'total_posts' })
  totalPosts: number;

  @Column({ type: 'int', default: 0, name: 'total_likes' })
  totalLikes: number;

  @Column({ type: 'int', default: 0, name: 'total_views' })
  totalViews: number;

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'featured_until' })
  featuredUntil?: Date;

  // --- Verification ---
  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'basic_verified_at' })
  basicVerifiedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'club_verified_at' })
  clubVerifiedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'performance_verified_at',
  })
  performanceVerifiedAt?: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'profile_completeness',
  })
  profileCompleteness: number;

  // --- Timestamps (from database) ---
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // --- Relations ---
  @OneToOne(() => User, user => user.playerProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => PlayerStats, stats => stats.player)
  stats: PlayerStats[];

  @OneToMany(() => CareerTimeline, timeline => timeline.player)
  careerTimeline: CareerTimeline[];

  @OneToMany(() => Achievement, achievement => achievement.player)
  achievements: Achievement[];
}
