import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';
import { ScoutProfile } from './scout-profile.entity';

@Entity('scout_notes')
@Index('idx_scout_notes_scout_player', ['scoutId', 'playerId'])
@Index('idx_scout_notes_scout_created_at', ['scoutId', 'createdAt'])
export class ScoutNotes extends BaseEntity {
  @Column('char', { length: 26, name: 'scout_id' })
  scoutId: string;

  @Column('char', { length: 26, name: 'player_id' })
  playerId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: true, name: 'is_private' })
  isPrivate: boolean;

  @ManyToOne(() => ScoutProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scout_id' })
  scout: ScoutProfile;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;
}
