import { Column, Entity, Index, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Bookmark } from './bookmark.entity';
import { Comment } from './comment.entity';
import { Favorite } from './favorite.entity';
import { Like } from './like.entity';
import { PlayerProfile } from './player-profile.entity';
import { Post } from './post.entity';
import { ScoutProfile } from './scout-profile.entity';

@Entity('users')
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

  @Column({ type: 'timestamptz', nullable: true, name: 'last_active' })
  lastActive?: Date;

  // --- Relations ---
  @OneToOne(() => PlayerProfile, profile => profile.user, { nullable: true })
  playerProfile?: PlayerProfile;

  @OneToOne(() => ScoutProfile, profile => profile.user, { nullable: true })
  scoutProfile?: ScoutProfile;

  @OneToMany(() => Favorite, favorite => favorite.user)
  favorites: Favorite[];

  @OneToMany(() => Post, post => post.user)
  posts: Post[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Like, like => like.user)
  likes: Like[];

  @OneToMany(() => Bookmark, bookmark => bookmark.user)
  bookmarks: Bookmark[];
  // createdAt & updatedAt inherited from BaseEntity
}
