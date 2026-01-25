import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PlayerProfile } from './player-profile.entity';

@Entity('achievements')
@Index(['competitionLevel'])
@Index(['playerId', 'year'])
export class Achievement extends BaseEntity {
  // --- Foreign Key ---
  @Column({ type: 'varchar', length: 26, name: 'player_id' })
  playerId: string;

  // --- Achievement Info ---
  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  year: number;

  // --- Competition Level ---
  @Column({
    type: 'enum',
    enum: ['local', 'regional', 'national', 'international'],
    name: 'competition_level',
  })
  competitionLevel: 'local' | 'regional' | 'national' | 'international';

  // --- Verification ---
  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true, name: 'evidence_url' })
  evidenceUrl?: string;

  // --- Relations ---
  @ManyToOne(() => PlayerProfile, profile => profile.achievements)
  @JoinColumn({ name: 'player_id' })
  player: PlayerProfile;
  // createdAt & updatedAt inherited from BaseEntity
}
