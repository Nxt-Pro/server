import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('player_stats')
@Unique(['playerId', 'seasonYear'])
@Index(['avgRating'])
export class PlayerStats extends BaseEntity {
  // --- Foreign Key ---
  @Column('char', { length: 26, name: 'player_id' })
  playerId: string;

  // --- Season & Context ---
  @Column({ name: 'season_year' })
  seasonYear: number;

  // --- Offensive Stats ---
  @Column({ default: 0, name: 'goals' })
  goals: number;

  @Column({ default: 0, name: 'assists' })
  assists: number;

  // --- Match Stats ---
  @Column({ type: 'int', default: 0, name: 'matches_played' })
  matchesPlayed: number;

  // --- Defensive/Discipline Stats ---
  @Column({ type: 'int', default: 0, name: 'yellow_cards' })
  yellowCards: number;

  @Column({ type: 'int', default: 0, name: 'red_cards' })
  redCards: number;

  @Column({ type: 'int', default: 0, name: 'clean_sheets' })
  cleanSheets: number;

  // --- Performance Rating ---
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    name: 'avg_rating',
  })
  avgRating?: number;

  // --- Relations ---
  @ManyToOne(() => PlayerProfile, profile => profile.stats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;
}
