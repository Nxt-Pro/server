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
}

@Entity('career_timeline')
export class CareerTimeline extends BaseEntity {
  @ManyToOne(() => PlayerProfile, profile => profile.career_timeline)
  player: PlayerProfile;

  @Column()
  title: string;

  @Column({ type: 'date' })
  start_date: Date;
}
