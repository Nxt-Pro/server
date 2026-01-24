import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlayerProfile } from './player-profile.entity';

@Entity('achievements')
@Index(['player_id'])
@Index(['year'])
@Index(['competition_level'])
export class Achievement {
  @PrimaryColumn('char', { length: 26 })
  player_id: string;

  @ManyToOne(() => PlayerProfile, profile => profile.achievements)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  year: number;

  @Column({
    type: 'enum',
    enum: ['local', 'regional', 'national', 'international'],
  })
  competition_level: 'local' | 'regional' | 'national' | 'international';

  @Column({ nullable: true })
  evidence_url?: string;

  @Column({ default: false })
  verified: boolean;
}
