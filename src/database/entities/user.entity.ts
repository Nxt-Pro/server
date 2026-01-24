import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity, PlayerProfile, ScoutProfile } from '.';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Hide password by default
  password_hash: string;

  @Column({ type: 'enum', enum: ['player', 'scout', 'admin'] })
  role: 'player' | 'scout' | 'admin';

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  })
  status: 'active' | 'suspended' | 'banned';

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'timestamp', nullable: true })
  last_active?: Date;

  @OneToOne(() => PlayerProfile, profile => profile.user, { nullable: true })
  playerProfile?: PlayerProfile;

  @OneToOne(() => ScoutProfile, profile => profile.user, { nullable: true })
  scoutProfile?: ScoutProfile;
}
