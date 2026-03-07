import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Event } from './event.entity';

@Entity('venues')
@Index('idx_venues_city_country', ['city', 'country'])
@Index('idx_venues_name', ['name'])
export class Venue extends BaseEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  country?: string;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ type: 'varchar', nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'text', array: true, nullable: true })
  images?: string[];

  @OneToMany(() => Event, event => event.venue)
  events: Event[];
}
