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
@Index(['userId'])
@Index(['verificationStatus'])
@Index(['organizationType'])
export class ScoutProfile {
  // --- Primary Key & Foreign Key ---
  @PrimaryColumn('char', { length: 26, name: 'user_id' })
  userId: string;

  // --- Basic Identity ---
  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  organization: string;

  @Column({
    type: 'enum',
    enum: ['club', 'agency', 'independent'],
    name: 'organization_type',
  })
  organizationType: 'club' | 'agency' | 'independent';

  // --- Credentials & Experience ---
  @Column({ nullable: true, name: 'license_number' })
  licenseNumber?: string;

  @Column({ type: 'int', nullable: true, name: 'years_experience' })
  yearsExperience?: number;

  // --- Specialization ---
  @Column({ type: 'simple-array', nullable: true, name: 'scouting_positions' })
  scoutingPositions?: string[];

  @Column({ type: 'simple-array', nullable: true, name: 'countries_covered' })
  countriesCovered?: string[];

  // --- Profile & Media ---
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true, name: 'profile_picture_url' })
  profilePictureUrl?: string;

  // --- Activity & Verification ---
  @Column({ type: 'int', default: 0, name: 'total_notes' })
  totalNotes: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    name: 'verification_status',
  })
  verificationStatus: 'pending' | 'verified' | 'rejected';

  @Column({ type: 'jsonb', nullable: true, name: 'verification_documents' })
  verificationDocuments?: Record<string, unknown>;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'profile_completeness',
  })
  profileCompleteness: number;

  // --- Timestamps ---
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // --- Relations ---
  @OneToOne(() => User, user => user.scoutProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
