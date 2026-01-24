import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('player_stats')
export class PlayerStats extends BaseEntity {
  @ManyToOne(() => PlayerProfile, profile => profile.stats)
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
