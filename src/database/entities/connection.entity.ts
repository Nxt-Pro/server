import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';
import { ScoutProfile } from './scout-profile.entity';

@Entity('connections')
@Unique(['playerId', 'scoutId'])
@Index(['scoutId'])
@Index(['status'])
export class Connection extends BaseEntity {
  @Column('char', { length: 26, name: 'player_id' })
  playerId: string;

  @Column('char', { length: 26, name: 'scout_id' })
  scoutId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
  })
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';

  @Column({
    type: 'enum',
    enum: ['player', 'scout'],
    name: 'initiated_by',
  })
  initiatedBy: 'player' | 'scout';

  @Column('timestamptz', { name: 'requested_at' })
  requestedAt: Date;

  @Column('timestamptz', { nullable: true, name: 'responded_at' })
  respondedAt?: Date;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @ManyToOne(() => ScoutProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scout_id' })
  scout: ScoutProfile;
}
