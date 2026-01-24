import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PlayerProfile } from './player-profile.entity';

@Entity('player_stats')
@Index(['player_id'])
@Index(['avg_rating'])
export class PlayerStats {
  @ManyToOne(() => PlayerProfile, profile => profile.stats)
  @PrimaryColumn('char', { length: 26 })
  player_id: string;

  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

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
