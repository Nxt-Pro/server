import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { EventRegistration } from './event-registration.entity';
import { User } from './user.entity';
import { Venue } from './venue.entity';

@Entity('events')
@Index('idx_events_organizer_id', ['organizer'])
@Index('idx_events_start_date', ['startDate'])
@Index('idx_events_status_start_date_desc', ['status', 'startDate'])
export class Event extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['tournament', 'trial', 'workshop'],
    name: 'event_type',
  })
  eventType: 'tournament' | 'trial' | 'workshop';

  @Column({ type: 'timestamptz', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamptz', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', nullable: true, name: 'end_time' })
  endTime: string | null;

  @Column({
    type: 'enum',
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval',
  })
  status: 'pending_approval' | 'approved' | 'rejected';

  @ManyToOne(() => User)
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({
    type: 'enum',
    enum: ['scout', 'admin'],
    name: 'organizer_type',
  })
  organizerType: 'scout' | 'admin';

  // Approval workflow
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    name: 'positions_targeted',
  })
  positionsTargeted: string[];

  @Column({ type: 'text', array: true, nullable: true, name: 'tags' })
  tags: string[];

  @Column({ type: 'int', default: 0, name: 'max_participants' })
  maxParticipants: number;

  @Column({ type: 'int', default: 0, name: 'participant_count' })
  participantCount: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'registration_deadline',
  })
  registrationDeadline: Date | null;

  @Column({ type: 'numeric', nullable: true, name: 'entry_fee' })
  entryFee: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'schedule' })
  schedule: Record<string, unknown>[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'prizes' })
  prizes: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'requirements' })
  requirements: string[] | null;

  @Column({ type: 'text', nullable: true, name: 'cover_image_url' })
  coverImageUrl: string | null;

  @ManyToOne(() => Venue, venue => venue.events, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => EventRegistration, registration => registration.event)
  registrations: EventRegistration[];
}
