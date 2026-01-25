import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('achievements')
@Index(['playerId'])
@Index(['year'])
@Index(['competitionLevel'])
export class Achievement extends BaseEntity {
  @Column({ type: 'varchar', length: 26, name: 'player_id' })
  playerId: string;

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
    name: 'competition_level',
  })
  competitionLevel: 'local' | 'regional' | 'national' | 'international';

  @Column({ nullable: true, name: 'evidence_url' })
  evidenceUrl?: string;

  @Column({ default: false })
  verified: boolean;
}
