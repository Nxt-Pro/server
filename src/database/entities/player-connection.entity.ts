import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('player_connections')
@Unique(['requesterId', 'addresseeId'])
@Index(['addresseeId'])
@Index(['status'])
export class PlayerConnection extends BaseEntity {
  @Column('char', { length: 26, name: 'requester_id' })
  requesterId: string;

  @Column('char', { length: 26, name: 'addressee_id' })
  addresseeId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
  })
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';

  @Column('timestamptz', { name: 'requested_at' })
  requestedAt: Date;

  @Column('timestamptz', { nullable: true, name: 'responded_at' })
  respondedAt?: Date;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: PlayerProfile;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressee_id' })
  addressee: PlayerProfile;
}
