import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './playerprofile.entity';
import { ScoutProfile } from './scoutprofile.entity';

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

  @OneToOne(() => PlayerProfile, profile => profile.user)
  playerProfile?: PlayerProfile;

  @OneToOne(() => ScoutProfile, profile => profile.user)
  scoutProfile?: ScoutProfile;
}
