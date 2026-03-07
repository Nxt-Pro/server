import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Event } from './event.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('event_registrations')
@Unique(['event', 'player'])
@Index('idx_event_registrations_status', ['status'])
@Index('idx_event_registrations_player_created_at_desc', [
  'player',
  'createdAt',
])
export class EventRegistration extends BaseEntity {
  @ManyToOne(() => Event, event => event.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => PlayerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'timestamptz', name: 'registered_at' })
  registeredAt: Date;

  @Column({ type: 'boolean', default: false })
  cancelled: boolean;

  @Column({ type: 'boolean', default: false })
  attended: boolean;
}
