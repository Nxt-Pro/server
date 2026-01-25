import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('achievements')
@Index(['player_id'])
@Index(['year'])
@Index(['competition_level'])
export class Achievement extends BaseEntity {
  @Column({ type: 'varchar', length: 26 })
  player_id: string;

  @ManyToOne(() => PlayerProfile, profile => profile.achievements)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  year: number;

  @Column({
    type: 'enum',
    enum: ['local', 'regional', 'national', 'international'],
  })
  competition_level: 'local' | 'regional' | 'national' | 'international';

  @Column({ nullable: true })
  evidence_url?: string;

  @Column({ default: false })
  verified: boolean;
}
