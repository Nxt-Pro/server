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
@Index(['playerId', 'seasonYear'])
@Index(['avgRating'])
export class PlayerStats {
  // --- Primary Key & Foreign Key ---
  @PrimaryColumn('char', { length: 26, name: 'player_id' })
  playerId: string;

  // --- Season & Context ---
  @Column({ name: 'season_year' })
  seasonYear: number;

  // --- Offensive Stats ---
  @Column()
  goals: number;

  @Column()
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

  // --- Timestamps ---
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  // --- Relations ---
  @ManyToOne(() => PlayerProfile, profile => profile.stats)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;
}
