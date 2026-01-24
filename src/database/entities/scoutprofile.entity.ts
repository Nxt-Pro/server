import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('scout_profiles')
export class ScoutProfile extends BaseEntity {
  @OneToOne(() => User, user => user.scoutProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  organization: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  })
  verification_status: string;
}
