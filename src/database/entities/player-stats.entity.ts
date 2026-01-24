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

@Entity('player_stats')
@Index(['player_id', 'season_year'])
@Index(['avg_rating'])
export class PlayerStats {
  @PrimaryColumn('char', { length: 26 })
  player_id: string;

  @ManyToOne(() => PlayerProfile, profile => profile.stats)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column()
  goals: number;

  @Column()
  assists: number;

  @Column()
  season_year: number;

  @Column({ type: 'int', default: 0 })
  matches_played: number;

  @Column({ type: 'int', default: 0 })
  yellow_cards: number;

  @Column({ type: 'int', default: 0 })
  red_cards: number;

  @Column({ type: 'int', default: 0 })
  clean_sheets: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  avg_rating?: number;
}
