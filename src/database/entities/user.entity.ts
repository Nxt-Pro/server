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

  @Column('text', { array: true, default: '{}', name: 'fcm_tokens' })
  fcmTokens: string[];

  // --- Password Reset ---
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'password_reset_token',
    select: false,
  })
  passwordResetToken?: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'password_reset_expires_at',
    select: false,
  })
  passwordResetExpiresAt?: Date | null;

  // --- Two-Factor Authentication (email code based) ---
  @Column({
    type: 'boolean',
    name: 'two_factor_enabled',
    default: false,
  })
  twoFactorEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    name: 'two_factor_code',
    select: false,
  })
  twoFactorCode?: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'two_factor_code_expires_at',
    select: false,
  })
  twoFactorCodeExpiresAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'two_factor_secret',
    select: false,
  })
  twoFactorSecret?: string | null;

  // --- OAuth / Social Login ---
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'oauth_provider',
  })
  oauthProvider?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'oauth_provider_id',
  })
  oauthProviderId?: string | null;

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
