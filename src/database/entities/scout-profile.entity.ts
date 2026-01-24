import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('scout_profiles')
@Index(['user_id'])
@Index(['verification_status'])
@Index(['organization_type'])
export class ScoutProfile {
  @PrimaryColumn('char', { length: 26 })
  user_id: string;

  @OneToOne(() => User, user => user.scoutProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column()
  full_name: string;

  @Column()
  organization: string;

  @Column({ type: 'enum', enum: ['club', 'agency', 'independent'] })
  organization_type: 'club' | 'agency' | 'independent';

  @Column({ nullable: true })
  license_number?: string;

  @Column({ type: 'simple-array', nullable: true })
  scouting_positions?: string[];

  @Column({ type: 'int', nullable: true })
  years_experience?: number;

  @Column({ type: 'simple-array', nullable: true })
  countries_covered?: string[];

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  profile_picture_url?: string;

  @Column({ type: 'int', default: 0 })
  total_notes: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  })
  verification_status: 'pending' | 'verified' | 'rejected';

  @Column({ type: 'jsonb', nullable: true })
  verification_documents?: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  profile_completeness: number;
}
