import { Column, Entity, Index, OneToOne } from 'typeorm';
import { BaseEntity, PlayerProfile, ScoutProfile } from '.';

@Entity('users')
@Index(['id'])
@Index(['email'])
@Index(['role'])
@Index(['lastActive'])
@Index(['status', 'lastActive'])
export class User extends BaseEntity {
  // --- Core Authentication ---
  @Column({ unique: true })
  email: string;

  @Column({ select: false, name: 'password_hash' }) // Hide password by default
  passwordHash: string;

  // --- User Role & Status ---
  @Column({ type: 'enum', enum: ['player', 'scout', 'admin'] })
  role: 'player' | 'scout' | 'admin';

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  })
  status: 'active' | 'suspended' | 'banned';

  // --- Contact & Activity ---
  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_active' })
  lastActive?: Date;

  // --- Relations ---
  @OneToOne(() => PlayerProfile, profile => profile.user, { nullable: true })
  playerProfile?: PlayerProfile;

  @OneToOne(() => ScoutProfile, profile => profile.user, { nullable: true })
  scoutProfile?: ScoutProfile;
  // createdAt & updatedAt inherited from BaseEntity
}
