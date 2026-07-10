import 'reflect-metadata';
import { promises as fs } from 'fs';
import { basename, dirname, join } from 'path';

import * as bcrypt from 'bcrypt';
import { QueryRunner } from 'typeorm';

import { AppDataSource } from '../config/data-source.config';
import { uploadConfig } from '../config/upload.config';
import {
  Achievement,
  AiSkillScoreJob,
  Attachment,
  AuditLog,
  Block,
  Bookmark,
  CareerTimeline,
  Chat,
  ChatParticipant,
  Comment,
  Connection,
  Event,
  EventRegistration,
  Favorite,
  Like,
  MediaModeration,
  Message,
  Mute,
  Notification,
  PlayerConnection,
  PlayerProfile,
  PlayerStats,
  Post,
  Report,
  ScoutNotes,
  ScoutProfile,
  User,
  UserNotificationPreference,
  Venue,
  Video,
  VideoSkillAnalysis,
} from '../database/entities';

const SALT_ROUNDS = 10;
const SEED_DOMAIN = 'dev.nxtpro.local';
const SEED_PASSWORD = 'NxtProDev!2026';
const SEED_FILE_PREFIX = 'dev-seed-';
const OUTPUT_DIR = join(process.cwd(), '.seed-output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'dev-accounts.json');
const AI_SCORING_SKILL_KEYS = ['pace', 'passing', 'physical', 'dribbling'];

type SeedMode = 'seed' | 'undo' | 'reset';
type Role = 'admin' | 'player' | 'scout';

interface AccountSeed {
  key: string;
  email: string;
  username: string;
  role: Role;
  status?: 'active' | 'suspended' | 'banned';
  phone: string;
  lastActiveDaysAgo: number;
  avatarGender: 'M' | 'F';
}

interface PlayerSeed extends AccountSeed {
  role: 'player';
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  secondaryPositions: string[];
  preferredFoot: 'left' | 'right' | 'both';
  heightCm: number;
  weightKg: number;
  city: string;
  country: string;
  clubName: string;
  availabilityStatus: 'available' | 'trialing' | 'contracted';
  bio: string;
  aiScore: number;
  skillScores: Record<string, number>;
  featured?: boolean;
  verified?: boolean;
}

interface ScoutSeed extends AccountSeed {
  role: 'scout';
  fullName: string;
  organization: string;
  organizationType: 'club' | 'agency' | 'independent';
  licenseNumber: string;
  yearsExperience: number;
  scoutingPositions: string[];
  countriesCovered: string[];
  bio: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface AdminSeed extends AccountSeed {
  role: 'admin';
}

interface SeedContext {
  users: Record<string, User>;
  players: Record<string, PlayerProfile>;
  scouts: Record<string, ScoutProfile>;
  posts: Post[];
  attachments: Attachment[];
  videos: Video[];
  chats: Chat[];
  events: Event[];
  venues: Venue[];
  recommendationExclusions: {
    blocked: Array<{ scoutKey: string; playerKey: string }>;
    muted: Array<{ scoutKey: string; playerKey: string }>;
  };
  media: SeedMedia;
  counts: Record<string, number>;
}

interface SeedMedia {
  avatars: Record<string, string>;
  covers: Record<string, string>;
  postImages: string[];
  postImagesByAsset: Record<string, string>;
  videos: string[];
  eventCovers: string[];
  venueImages: string[];
  files: string[];
  videoSources: Record<string, 'root-assets'>;
}

interface DeletionSummary {
  [key: string]: number;
}

const admins: AdminSeed[] = [
  {
    key: 'admin_ops',
    email: `amara.okafor@${SEED_DOMAIN}`,
    username: 'amara_okafor_admin',
    role: 'admin',
    phone: '+15550101001',
    lastActiveDaysAgo: 0,
    avatarGender: 'M',
  },
  {
    key: 'admin_moderation',
    email: `julia.martin@${SEED_DOMAIN}`,
    username: 'julia_martin_admin',
    role: 'admin',
    phone: '+15550101002',
    lastActiveDaysAgo: 1,
    avatarGender: 'F',
  },
];

const preferredAvatarAssets: Record<string, string> = {
  leo_fischer: 'avatar15M.jpg',
  samir_okafor: 'avatar21M.jpg',
  diego_alvarez: 'avatar18M.jpg',
  noah_reed: 'avatar20M.jpg',
  ethan_brooks: 'avatar19M.jpg',
};

function avatarGenderFromAsset(filePath: string): 'M' | 'F' | null {
  const match = basename(filePath).match(/([mf])\.[a-z0-9]+$/i);
  if (!match) return null;
  return match[1].toUpperCase() as 'M' | 'F';
}

const approvedPosterAssets = [
  'videoframe_0.png',
  'videoframe_0 (6).png',
  'videoframe_0 (8).png',
  'videoframe_0 (9).png',
  'videoframe_0 (11).png',
  'videoframe_0 (13).png',
  'videoframe_0 (14).png',
  'videoframe_1431.png',
  'videoframe_9733.png',
];

const postAssetOverrides: Record<number, string[]> = {
  5: ['videoframe_0 (6).png'],
  6: ['videoframe_0 (9).png'],
  10: ['videoframe_0 (11).png'],
  11: ['videoframe_1431.png'],
  13: ['videoframe_0.png'],
  15: ['videoframe_0 (13).png'],
  17: ['videoframe_9733.png', 'videoframe_0 (14).png', 'videoframe_0 (8).png'],
};

const players: PlayerSeed[] = [
  {
    key: 'tarek_hassan',
    email: `tarek.hassan@${SEED_DOMAIN}`,
    username: 'tarek_hassan_10',
    role: 'player',
    phone: '+15550201001',
    lastActiveDaysAgo: 0,
    avatarGender: 'M',
    fullName: 'Tarek Hassan',
    dateOfBirth: '2006-04-18',
    nationality: 'Egyptian',
    position: 'Attacking Midfielder',
    secondaryPositions: ['Right Winger', 'Central Midfielder'],
    preferredFoot: 'right',
    heightCm: 178,
    weightKg: 70,
    city: 'Cairo',
    country: 'Egypt',
    clubName: 'Cairo Rising Academy',
    availabilityStatus: 'available',
    bio: 'Creative midfielder who looks between the lines and presses quickly after turnovers.',
    aiScore: 86.4,
    skillScores: {
      shooting: 78,
      passing: 88,
      dribbling: 90,
      defending: 58,
      physical: 73,
    },
    featured: true,
    verified: true,
  },
  {
    key: 'milo_grant',
    email: `milo.grant@${SEED_DOMAIN}`,
    username: 'milo_grant_cf',
    role: 'player',
    phone: '+15550201002',
    lastActiveDaysAgo: 1,
    avatarGender: 'M',
    fullName: 'Milo Grant',
    dateOfBirth: '2005-11-02',
    nationality: 'Canadian',
    position: 'Striker',
    secondaryPositions: ['Left Winger'],
    preferredFoot: 'left',
    heightCm: 184,
    weightKg: 76,
    city: 'Toronto',
    country: 'Canada',
    clubName: 'Northlake U21',
    availabilityStatus: 'trialing',
    bio: 'Direct forward with sharp near-post movement and a calm first touch in crowded boxes.',
    aiScore: 83.1,
    skillScores: {
      pace: 85,
      shooting: 87,
      defending: 45,
      physical: 82,
    },
    verified: true,
  },
  {
    key: 'leo_fischer',
    email: `leo.fischer@${SEED_DOMAIN}`,
    username: 'leo_fischer_6',
    role: 'player',
    phone: '+15550201003',
    lastActiveDaysAgo: 2,
    avatarGender: 'M',
    fullName: 'Leo Fischer',
    dateOfBirth: '2004-08-27',
    nationality: 'German',
    position: 'Defensive Midfielder',
    secondaryPositions: ['Center Back'],
    preferredFoot: 'right',
    heightCm: 181,
    weightKg: 74,
    city: 'Berlin',
    country: 'Germany',
    clubName: 'Spree Athletic II',
    availabilityStatus: 'contracted',
    bio: 'Screening midfielder with strong scanning habits and clean first passes under pressure.',
    aiScore: 81.8,
    skillScores: {
      pace: 74,
      shooting: 61,
      passing: 84,
      dribbling: 76,
      defending: 86,
    },
  },
  {
    key: 'samir_okafor',
    email: `samir.okafor@${SEED_DOMAIN}`,
    username: 'samir_okafor_cb',
    role: 'player',
    phone: '+15550201004',
    lastActiveDaysAgo: 4,
    avatarGender: 'M',
    fullName: 'Samir Okafor',
    dateOfBirth: '2003-02-14',
    nationality: 'Nigerian',
    position: 'Center Back',
    secondaryPositions: ['Right Back'],
    preferredFoot: 'right',
    heightCm: 190,
    weightKg: 84,
    city: 'Lagos',
    country: 'Nigeria',
    clubName: 'Lagos Harbour FC',
    availabilityStatus: 'available',
    bio: 'Front-foot defender who wins first contact and organizes the back line loudly.',
    aiScore: 79.9,
    skillScores: {
      shooting: 48,
      defending: 89,
      physical: 88,
    },
    verified: true,
  },
  {
    key: 'diego_alvarez',
    email: `diego.alvarez@${SEED_DOMAIN}`,
    username: 'diego_alvarez_rw',
    role: 'player',
    phone: '+15550201005',
    lastActiveDaysAgo: 1,
    avatarGender: 'M',
    fullName: 'Diego Alvarez',
    dateOfBirth: '2006-09-30',
    nationality: 'Mexican',
    position: 'Right Winger',
    secondaryPositions: ['Left Winger', 'Second Striker'],
    preferredFoot: 'left',
    heightCm: 172,
    weightKg: 66,
    city: 'Guadalajara',
    country: 'Mexico',
    clubName: 'Jalisco Select',
    availabilityStatus: 'available',
    bio: 'Inverted winger who attacks the half-space and creates separation with quick double moves.',
    aiScore: 85.7,
    skillScores: {
      pace: 91,
      shooting: 79,
      dribbling: 89,
      defending: 50,
    },
    featured: true,
  },
  {
    key: 'omar_benali',
    email: `omar.benali@${SEED_DOMAIN}`,
    username: 'omar_benali_gk',
    role: 'player',
    phone: '+15550201006',
    lastActiveDaysAgo: 3,
    avatarGender: 'M',
    fullName: 'Omar Benali',
    dateOfBirth: '2002-12-11',
    nationality: 'Moroccan',
    position: 'Goalkeeper',
    secondaryPositions: [],
    preferredFoot: 'right',
    heightCm: 193,
    weightKg: 86,
    city: 'Casablanca',
    country: 'Morocco',
    clubName: 'Atlantic Keepers',
    availabilityStatus: 'trialing',
    bio: 'Commanding goalkeeper with a long passing range and aggressive starting position.',
    aiScore: 80.6,
    skillScores: {
      reflexes: 86,
      handling: 82,
      distribution: 79,
      positioning: 83,
      aerial: 85,
      physical: 81,
    },
  },
  {
    key: 'noah_reed',
    email: `noah.reed@${SEED_DOMAIN}`,
    username: 'noah_reed_lb',
    role: 'player',
    phone: '+15550201007',
    lastActiveDaysAgo: 5,
    avatarGender: 'M',
    fullName: 'Noah Reed',
    dateOfBirth: '2005-05-21',
    nationality: 'American',
    position: 'Left Back',
    secondaryPositions: ['Left Wing Back'],
    preferredFoot: 'left',
    heightCm: 176,
    weightKg: 71,
    city: 'Austin',
    country: 'United States',
    clubName: 'Hill Country Academy',
    availabilityStatus: 'contracted',
    bio: 'High-energy fullback who overlaps relentlessly and recovers well in transition.',
    aiScore: 78.4,
    skillScores: {
      shooting: 56,
      passing: 74,
      defending: 80,
      physical: 78,
    },
  },
  {
    key: 'ethan_brooks',
    email: `ethan.brooks@${SEED_DOMAIN}`,
    username: 'ethan_brooks_11',
    role: 'player',
    status: 'banned',
    phone: '+15550201008',
    lastActiveDaysAgo: 16,
    avatarGender: 'M',
    fullName: 'Ethan Brooks',
    dateOfBirth: '2004-01-09',
    nationality: 'English',
    position: 'Left Winger',
    secondaryPositions: ['Striker'],
    preferredFoot: 'right',
    heightCm: 179,
    weightKg: 72,
    city: 'Manchester',
    country: 'England',
    clubName: 'North Bridge Academy',
    availabilityStatus: 'available',
    bio: 'Wide forward fixture kept banned for visibility and moderation smoke testing.',
    aiScore: 77.2,
    skillScores: {
      pace: 82,
      shooting: 75,
      passing: 70,
      dribbling: 84,
      defending: 43,
    },
  },
];

const scouts: ScoutSeed[] = [
  {
    key: 'maya_cole',
    email: `maya.cole@${SEED_DOMAIN}`,
    username: 'maya_cole_scout',
    role: 'scout',
    phone: '+15550301001',
    lastActiveDaysAgo: 0,
    avatarGender: 'F',
    fullName: 'Maya Cole',
    organization: 'Bridgeview Talent ID',
    organizationType: 'agency',
    licenseNumber: 'BVT-2044',
    yearsExperience: 9,
    scoutingPositions: ['Winger', 'Attacking Midfielder', 'Striker'],
    countriesCovered: ['United States', 'Canada', 'Mexico'],
    bio: 'North American talent scout focused on explosive attackers and academy-to-pro pathways.',
    verificationStatus: 'verified',
  },
  {
    key: 'nabil_fares',
    email: `nabil.fares@${SEED_DOMAIN}`,
    username: 'nabil_fares_scout',
    role: 'scout',
    phone: '+15550301002',
    lastActiveDaysAgo: 2,
    avatarGender: 'M',
    fullName: 'Nabil Fares',
    organization: 'Mediterranean Performance Group',
    organizationType: 'club',
    licenseNumber: 'MPG-1198',
    yearsExperience: 12,
    scoutingPositions: ['Goalkeeper', 'Center Back', 'Defensive Midfielder'],
    countriesCovered: ['Egypt', 'Morocco', 'Tunisia', 'France'],
    bio: 'Regional scout with a bias toward game intelligence, resilience, and repeatable technique.',
    verificationStatus: 'verified',
  },
  {
    key: 'ella_sato',
    email: `ella.sato@${SEED_DOMAIN}`,
    username: 'ella_sato_independent',
    role: 'scout',
    phone: '+15550301003',
    lastActiveDaysAgo: 4,
    avatarGender: 'F',
    fullName: 'Ella Sato',
    organization: 'Independent Video Scout',
    organizationType: 'independent',
    licenseNumber: 'IND-7721',
    yearsExperience: 6,
    scoutingPositions: ['Fullback', 'Central Midfielder'],
    countriesCovered: ['Germany', 'Netherlands', 'Japan'],
    bio: 'Video-first scout building shortlists from tactical clips, physical markers, and consistency.',
    verificationStatus: 'pending',
  },
];

const allAccounts: AccountSeed[] = [...admins, ...players, ...scouts];
const seedEmails = allAccounts.map(account => account.email);

function buildPlayerSkillGapSummary() {
  return players.map(player => {
    const scored = AI_SCORING_SKILL_KEYS.filter(
      key => player.skillScores[key] !== undefined,
    );
    return {
      player: player.fullName,
      email: player.email,
      scored,
      missing: AI_SCORING_SKILL_KEYS.filter(key => !scored.includes(key)),
      otherSeededSkills: Object.keys(player.skillScores).filter(
        key => !AI_SCORING_SKILL_KEYS.includes(key),
      ),
    };
  });
}

function requireDevSeedAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev seed scripts are disabled when NODE_ENV=production.');
  }

  if (process.env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('Set ALLOW_DEV_SEED=true to run development seed scripts.');
  }
}

function assertMode(rawMode: string | undefined): SeedMode {
  if (rawMode === 'undo' || rawMode === 'reset' || rawMode === 'seed') {
    return rawMode;
  }

  return 'seed';
}

function daysAgo(days: number, hours = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  return date;
}

function daysFromNow(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function publicUrl(relativePath: string): string {
  const config = uploadConfig();
  return `${config.localPublicBaseUrl.replace(/\/+$/, '')}/${relativePath.replace(/^\/+/, '')}`;
}

function uploadPath(relativePath: string): string {
  return join(process.cwd(), uploadConfig().localUploadDir, relativePath);
}

function extensionForPath(filePath: string): string {
  const fileName = basename(filePath);
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

async function findRootAssetsDir(): Promise<string | null> {
  const candidates = [
    process.env.DEV_SEED_ASSETS_DIR,
    join(process.cwd(), 'assets'),
    join(process.cwd(), '..', 'assets'),
    '/app/assets',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // Try the next local or Docker path.
    }
  }

  return null;
}

async function listAssetFiles(
  folderPath: string,
  allowedExtensions: string[],
): Promise<string[]> {
  const entries = await fs.readdir(folderPath).catch(() => []);
  return entries
    .filter(entry => allowedExtensions.includes(extensionForPath(entry)))
    .sort((left, right) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )
    .map(entry => join(folderPath, entry));
}

async function getPngDimensions(
  filePath: string,
): Promise<{ width: number; height: number } | null> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(24);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < buffer.length) return null;

    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (!isPng) return null;

    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  } finally {
    await handle.close();
  }
}

async function keepMobileFriendlyImages(files: string[]): Promise<string[]> {
  const filtered: string[] = [];

  for (const file of files) {
    const ext = extensionForPath(file);
    if (ext !== 'png') {
      filtered.push(file);
      continue;
    }

    const dimensions = await getPngDimensions(file).catch(() => null);
    if (
      !dimensions ||
      (dimensions.width <= 1920 && dimensions.height <= 1920)
    ) {
      filtered.push(file);
    }
  }

  return filtered.length > 0 ? filtered : files;
}

function findAssetByFileName(
  files: string[],
  fileName: string,
): string | undefined {
  return files.find(file => basename(file) === fileName);
}

function safeAssetName(filePath: string): string {
  return basename(filePath, `.${extensionForPath(filePath)}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function copySeedAsset(
  sourcePath: string,
  relativeTargetPath: string,
): Promise<string> {
  const targetPath = uploadPath(relativeTargetPath);
  await fs.mkdir(dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return publicUrl(relativeTargetPath);
}

async function tryCreateMediaFromRootAssets(): Promise<SeedMedia | null> {
  const assetsDir = await findRootAssetsDir();
  if (!assetsDir) return null;

  const picsDir = join(assetsDir, 'pics');
  const videosDir = join(assetsDir, 'videos');
  const avatars = await listAssetFiles(picsDir, ['jpg', 'jpeg', 'png', 'webp']);
  const pictures = await listAssetFiles(picsDir, [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ]);
  const videos = await listAssetFiles(videosDir, ['mp4', 'mov', 'm4v', 'webm']);
  const avatarAssets = avatars.filter(file =>
    basename(file).toLowerCase().startsWith('avatar'),
  );
  const maleAvatarAssets = avatarAssets.filter(
    file => avatarGenderFromAsset(file) === 'M',
  );
  const femaleAvatarAssets = avatarAssets.filter(
    file => avatarGenderFromAsset(file) === 'F',
  );
  const mobileFriendlyPosterAssets = await keepMobileFriendlyImages(
    pictures.filter(file => !basename(file).toLowerCase().startsWith('avatar')),
  );
  const approvedPosters = approvedPosterAssets
    .map(fileName => findAssetByFileName(mobileFriendlyPosterAssets, fileName))
    .filter((file): file is string => Boolean(file));
  const posterAssets =
    approvedPosters.length > 0 ? approvedPosters : mobileFriendlyPosterAssets;

  if (
    avatarAssets.length === 0 ||
    posterAssets.length === 0 ||
    videos.length === 0
  ) {
    return null;
  }

  const media: SeedMedia = {
    avatars: {},
    covers: {},
    postImages: [],
    postImagesByAsset: {},
    videos: [],
    eventCovers: [],
    venueImages: [],
    files: [],
    videoSources: {},
  };

  const avatarIndexes: Record<'M' | 'F', number> = { M: 0, F: 0 };

  for (const [index, account] of allAccounts.entries()) {
    const genderedAvatars =
      account.avatarGender === 'F' ? femaleAvatarAssets : maleAvatarAssets;
    if (genderedAvatars.length === 0) {
      throw new Error(
        `Development seed requires at least one ${account.avatarGender} avatar asset ending in ${account.avatarGender}.`,
      );
    }

    const preferredAvatar = preferredAvatarAssets[account.key]
      ? findAssetByFileName(genderedAvatars, preferredAvatarAssets[account.key])
      : undefined;
    const avatarAsset =
      preferredAvatar ??
      genderedAvatars[
        avatarIndexes[account.avatarGender]++ % genderedAvatars.length
      ];

    if (avatarGenderFromAsset(avatarAsset) !== account.avatarGender) {
      throw new Error(
        `Avatar gender mismatch for ${account.key}: expected ${account.avatarGender}, got ${basename(avatarAsset)}.`,
      );
    }

    const coverAsset = posterAssets[(index * 2) % posterAssets.length];
    const avatarExt = extensionForPath(avatarAsset);
    const coverExt = extensionForPath(coverAsset);
    const avatarPath = `images/${SEED_FILE_PREFIX}avatar-${account.key}-${account.avatarGender}.${avatarExt}`;
    const coverPath = `images/${SEED_FILE_PREFIX}cover-${account.key}.${coverExt}`;

    media.avatars[account.key] = await copySeedAsset(avatarAsset, avatarPath);
    media.covers[account.key] = await copySeedAsset(coverAsset, coverPath);
    media.files.push(uploadPath(avatarPath), uploadPath(coverPath));
  }

  for (const source of posterAssets) {
    const ext = extensionForPath(source);
    const imagePath = `images/${SEED_FILE_PREFIX}post-${safeAssetName(source)}.${ext}`;
    const url = await copySeedAsset(source, imagePath);
    media.postImages.push(url);
    media.postImagesByAsset[basename(source)] = url;
    media.files.push(uploadPath(imagePath));
  }

  for (let index = 0; index < 8; index += 1) {
    const videoSource = videos[index % videos.length];
    const videoExt = extensionForPath(videoSource);
    const videoPath = `videos/${SEED_FILE_PREFIX}highlight-${String(index + 1).padStart(2, '0')}.${videoExt}`;

    media.videos.push(await copySeedAsset(videoSource, videoPath));
    media.videoSources[videoPath] = 'root-assets';
    media.files.push(uploadPath(videoPath));
  }

  for (let index = 0; index < 4; index += 1) {
    const coverSource = posterAssets[(index + 16) % posterAssets.length];
    const venueSource = posterAssets[(index + 20) % posterAssets.length];
    const coverExt = extensionForPath(coverSource);
    const venueExt = extensionForPath(venueSource);
    const coverPath = `images/${SEED_FILE_PREFIX}event-cover-${index + 1}.${coverExt}`;
    const venuePath = `images/${SEED_FILE_PREFIX}venue-${index + 1}.${venueExt}`;

    media.eventCovers.push(await copySeedAsset(coverSource, coverPath));
    media.venueImages.push(await copySeedAsset(venueSource, venuePath));
    media.files.push(uploadPath(coverPath), uploadPath(venuePath));
  }

  return media;
}

async function createSeedMedia(): Promise<SeedMedia> {
  const rootAssetMedia = await tryCreateMediaFromRootAssets();
  if (rootAssetMedia) {
    return rootAssetMedia;
  }

  throw new Error(
    [
      'Development seed requires the monorepo root assets directory.',
      'Expected usable media in assets/pics/avatar*, non-avatar images in assets/pics, and assets/videos/*.',
      'The seed will not fall back to generated or bundled media.',
      'For Docker Compose, recreate the api container so ../assets is mounted at /app/assets:',
      'docker compose --env-file .env.ai -f docker-compose.ai.yml up -d --build --force-recreate api',
    ].join(' '),
  );
}

async function deleteSeedMedia(): Promise<number> {
  const uploadRoot = join(process.cwd(), uploadConfig().localUploadDir);
  const folders = ['images', 'videos', 'audio'];
  let deleted = 0;

  for (const folder of folders) {
    const folderPath = join(uploadRoot, folder);
    const entries = await fs.readdir(folderPath).catch(() => []);
    for (const entry of entries) {
      if (!entry.startsWith(SEED_FILE_PREFIX)) continue;
      await fs.unlink(join(folderPath, entry)).catch(() => undefined);
      deleted += 1;
    }
  }

  await fs.rm(OUTPUT_FILE, { force: true }).catch(() => undefined);

  return deleted;
}

async function undoSeedData(
  queryRunner: QueryRunner,
): Promise<DeletionSummary> {
  const manager = queryRunner.manager;
  const seedUsers = await manager.getRepository(User).find({
    where: seedEmails.map(email => ({ email })),
    select: ['id', 'email', 'role'],
  });
  const userIds = seedUsers.map(user => user.id);
  const summary: DeletionSummary = {};

  if (userIds.length === 0) {
    summary.users = 0;
    return summary;
  }

  const run = async (label: string, sql: string, params: unknown[] = []) => {
    const result = (await queryRunner.query(`${sql} RETURNING 1`, params)) as
      | unknown[]
      | [unknown[], number];
    summary[label] = Array.isArray(result[0])
      ? result[0].length
      : (result as unknown[]).length;
  };

  await run(
    'video_skill_analysis',
    'DELETE FROM video_skill_analysis WHERE video_id IN (SELECT a.id FROM attachments a JOIN posts p ON p.id = a.post_id WHERE p.user_id = ANY($1))',
    [userIds],
  );
  await run(
    'videos',
    'DELETE FROM videos WHERE id IN (SELECT a.id FROM attachments a JOIN posts p ON p.id = a.post_id WHERE p.user_id = ANY($1))',
    [userIds],
  );
  await run(
    'media_moderation',
    'DELETE FROM media_moderation WHERE attachment_id IN (SELECT a.id FROM attachments a JOIN posts p ON p.id = a.post_id WHERE p.user_id = ANY($1))',
    [userIds],
  );
  await run(
    'comments',
    'DELETE FROM comments WHERE user_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1))',
    [userIds],
  );
  await run(
    'likes',
    'DELETE FROM likes WHERE user_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1))',
    [userIds],
  );
  await run(
    'bookmarks',
    'DELETE FROM bookmarks WHERE user_id = ANY($1) OR bookmarkable_id IN (SELECT id FROM posts WHERE user_id = ANY($1)) OR bookmarkable_id = ANY($1)',
    [userIds],
  );
  await run(
    'favorites',
    'DELETE FROM favorites WHERE user_id = ANY($1) OR favorited_id = ANY($1)',
    [userIds],
  );
  await run(
    'attachments',
    'DELETE FROM attachments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ANY($1))',
    [userIds],
  );
  await run('posts', 'DELETE FROM posts WHERE user_id = ANY($1)', [userIds]);
  await run(
    'messages',
    'DELETE FROM messages WHERE sender_id = ANY($1) OR chat_id IN (SELECT id FROM chats WHERE scout_id = ANY($1) OR player_id = ANY($1))',
    [userIds],
  );
  await run(
    'chat_participants',
    'DELETE FROM chat_participants WHERE user_id = ANY($1) OR chat_id IN (SELECT id FROM chats WHERE scout_id = ANY($1) OR player_id = ANY($1))',
    [userIds],
  );
  await run(
    'chats',
    'DELETE FROM chats WHERE scout_id = ANY($1) OR player_id = ANY($1)',
    [userIds],
  );
  await run(
    'notifications',
    'DELETE FROM notifications WHERE user_id = ANY($1) OR reference_id = ANY($1)',
    [userIds],
  );
  await run(
    'event_registrations',
    'DELETE FROM event_registrations WHERE player_id = ANY($1) OR event_id IN (SELECT id FROM events WHERE organizer_id = ANY($1) OR created_by_id = ANY($1) OR approved_by_id = ANY($1))',
    [userIds],
  );
  await run(
    'events',
    'DELETE FROM events WHERE organizer_id = ANY($1) OR created_by_id = ANY($1) OR approved_by_id = ANY($1)',
    [userIds],
  );
  await run('venues', 'DELETE FROM venues WHERE contact_email LIKE $1', [
    `%@${SEED_DOMAIN}`,
  ]);
  await run(
    'connections',
    'DELETE FROM connections WHERE player_id = ANY($1) OR scout_id = ANY($1)',
    [userIds],
  );
  await run(
    'player_connections',
    'DELETE FROM player_connections WHERE requester_id = ANY($1) OR addressee_id = ANY($1)',
    [userIds],
  );
  await run(
    'scout_notes',
    'DELETE FROM scout_notes WHERE scout_id = ANY($1) OR player_id = ANY($1)',
    [userIds],
  );
  await run(
    'ai_skill_score_jobs',
    'DELETE FROM ai_skill_score_jobs WHERE player_id = ANY($1) OR requested_by = ANY($1)',
    [userIds],
  );
  await run(
    'player_stats',
    'DELETE FROM player_stats WHERE player_id = ANY($1)',
    [userIds],
  );
  await run(
    'career_timeline',
    'DELETE FROM career_timeline WHERE player_id = ANY($1)',
    [userIds],
  );
  await run(
    'achievements',
    'DELETE FROM achievements WHERE player_id = ANY($1)',
    [userIds],
  );
  await run(
    'reports',
    'DELETE FROM reports WHERE reporter_id = ANY($1) OR resolved_by_id = ANY($1) OR reported_id = ANY($1)',
    [userIds],
  );
  await run(
    'audit_logs',
    "DELETE FROM audit_logs WHERE actor_id = ANY($1) OR entity_id = ANY($1) OR metadata->>'seed' = $2",
    [userIds, 'dev-seed'],
  );
  await run(
    'user_notification_preferences',
    'DELETE FROM user_notification_preferences WHERE user_id = ANY($1)',
    [userIds],
  );
  await run(
    'blocks',
    'DELETE FROM blocks WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)',
    [userIds],
  );
  await run(
    'mutes',
    'DELETE FROM mutes WHERE muter_id = ANY($1) OR muted_id = ANY($1)',
    [userIds],
  );
  await run(
    'player_profiles',
    'DELETE FROM player_profiles WHERE user_id = ANY($1)',
    [userIds],
  );
  await run(
    'scout_profiles',
    'DELETE FROM scout_profiles WHERE user_id = ANY($1)',
    [userIds],
  );
  await run('users', 'DELETE FROM users WHERE id = ANY($1)', [userIds]);

  return summary;
}

async function seedUsers(queryRunner: QueryRunner, media: SeedMedia) {
  const manager = queryRunner.manager;
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  const users: Record<string, User> = {};
  const playerProfiles: Record<string, PlayerProfile> = {};
  const scoutProfiles: Record<string, ScoutProfile> = {};

  for (const account of allAccounts) {
    const user = manager.getRepository(User).create({
      email: account.email,
      username: account.username,
      passwordHash,
      role: account.role,
      status: account.status ?? 'active',
      phone: account.phone,
      lastActive: daysAgo(account.lastActiveDaysAgo),
      fcmTokens: [],
      twoFactorEnabled: false,
    });
    users[account.key] = await manager.getRepository(User).save(user);

    await manager.getRepository(UserNotificationPreference).save(
      manager.getRepository(UserNotificationPreference).create({
        user: users[account.key],
        inAppNotifications: true,
        emailNotifications: account.role === 'admin' ? false : true,
        chatRequests: true,
        chatMessages: true,
        chatAccepted: true,
        connections: true,
        postEngagement: true,
        eventUpdates: true,
        verificationUpdates: true,
      }),
    );
  }

  for (const seed of players) {
    const profile = manager.getRepository(PlayerProfile).create({
      userId: users[seed.key].id,
      user: users[seed.key],
      fullName: seed.fullName,
      dateOfBirth: dateOnly(seed.dateOfBirth),
      nationality: seed.nationality,
      position: seed.position,
      secondaryPositions: seed.secondaryPositions,
      preferredFoot: seed.preferredFoot,
      heightCm: seed.heightCm,
      weightKg: seed.weightKg,
      city: seed.city,
      country: seed.country,
      clubName: seed.clubName,
      availabilityStatus: seed.availabilityStatus,
      bio: seed.bio,
      profilePictureUrl: media.avatars[seed.key],
      coverImageUrl: media.covers[seed.key],
      aiScore: seed.aiScore,
      skillScores: seed.skillScores,
      isFeatured: seed.featured ?? false,
      featuredUntil: seed.featured ? daysFromNow(30) : undefined,
      isVerified: seed.verified ?? false,
      basicVerifiedAt: seed.verified ? daysAgo(28) : undefined,
      clubVerifiedAt: seed.verified ? daysAgo(21) : undefined,
      performanceVerifiedAt: seed.verified ? daysAgo(14) : undefined,
      profileCompleteness: 96,
      totalViews: 0,
      totalLikes: 0,
      totalPosts: 0,
    });
    playerProfiles[seed.key] = await manager
      .getRepository(PlayerProfile)
      .save(profile);
  }

  for (const seed of scouts) {
    const profile = manager.getRepository(ScoutProfile).create({
      userId: users[seed.key].id,
      user: users[seed.key],
      fullName: seed.fullName,
      organization: seed.organization,
      organizationType: seed.organizationType,
      licenseNumber: seed.licenseNumber,
      yearsExperience: seed.yearsExperience,
      scoutingPositions: seed.scoutingPositions,
      countriesCovered: seed.countriesCovered,
      bio: seed.bio,
      profilePictureUrl: media.avatars[seed.key],
      coverImageUrl: media.covers[seed.key],
      verificationStatus: seed.verificationStatus,
      verificationDocuments: {
        seed: 'dev-seed',
        license: seed.licenseNumber,
        note: 'Synthetic verification record for local development.',
      },
      profileCompleteness: 94,
      totalNotes: 0,
    });
    scoutProfiles[seed.key] = await manager
      .getRepository(ScoutProfile)
      .save(profile);
  }

  return { users, playerProfiles, scoutProfiles };
}

async function seedPlayerProfileDetails(
  queryRunner: QueryRunner,
  ctx: SeedContext,
) {
  const manager = queryRunner.manager;
  let stats = 0;
  let achievements = 0;
  let timeline = 0;

  for (const [index, seed] of players.entries()) {
    const profile = ctx.players[seed.key];
    await manager.getRepository(PlayerStats).save(
      manager.getRepository(PlayerStats).create({
        playerId: profile.userId,
        player: profile,
        seasonYear: 2026,
        goals: seed.position.includes('Striker') ? 18 : Math.max(1, 8 - index),
        assists: seed.position.includes('Midfielder') ? 14 : 5 + index,
        matchesPlayed: 22 + index,
        yellowCards: Math.min(5, index + 1),
        redCards: index === 3 ? 1 : 0,
        cleanSheets: seed.position === 'Goalkeeper' ? 9 : 0,
        avgRating: Number((7.1 + index * 0.11).toFixed(2)),
      }),
    );
    stats += 1;

    await manager.getRepository(CareerTimeline).save([
      manager.getRepository(CareerTimeline).create({
        playerId: profile.userId,
        player: profile,
        title: `${seed.clubName} development squad`,
        description:
          'Joined the current training environment and logged verified match minutes.',
        startDate: dateOnly('2024-08-01'),
        isCurrent: true,
      }),
      manager.getRepository(CareerTimeline).create({
        playerId: profile.userId,
        player: profile,
        title: 'Regional showcase selection',
        description:
          'Selected for a regional talent camp after video and match review.',
        startDate: dateOnly('2023-06-01'),
        endDate: dateOnly('2023-06-21'),
        isCurrent: false,
      }),
    ]);
    timeline += 2;

    await manager.getRepository(Achievement).save(
      manager.getRepository(Achievement).create({
        playerId: profile.userId,
        player: profile,
        title: `${seed.position} standout report`,
        description:
          'Named in the weekly scouting shortlist for consistent match impact.',
        year: 2025,
        competitionLevel: index % 3 === 0 ? 'regional' : 'local',
        verified: index % 2 === 0,
      }),
    );
    achievements += 1;
  }

  ctx.counts.player_stats = stats;
  ctx.counts.career_timeline = timeline;
  ctx.counts.achievements = achievements;
}

async function seedPosts(queryRunner: QueryRunner, ctx: SeedContext) {
  const manager = queryRunner.manager;
  const captions = [
    'Small-sided rondo work: two-touch limit, scan before receiving, punch the pass into the far foot.',
    'Recovery day but still getting clean technical reps. First touch sets up everything.',
    'Three clips from the weekend match: pressure regain, carry, slipped pass into the box.',
    'Finishing block after training. Near post, far post, cutback, repeat until it feels boring.',
    'Back line communication session. The best defending starts before the pass is played.',
    'Trial prep: acceleration mechanics and first five meters. Looking for sharper separation.',
    'Matchday photos from the academy cup. Good lessons, better standards next week.',
    'Goalkeeper distribution circuit: clip, drive, side volley, reset.',
    'Fullback overlap pattern with the winger checking inside. Timing was the whole session.',
    'Video notes from yesterday: body shape before receiving changed the next action.',
    'Set-piece delivery practice. Hitting the same zone with different runups.',
    '1v1 defending reps. Patience, angle, then contact.',
    'Highlight reel from the last three matches. Proud of the progress, still hungry.',
    'First session with the GPS vest. Useful to see the sprint load after a tough week.',
    'Left-foot crossing block after gym. Quality was better once fatigue hit.',
    'Quick wall-pass sequence from morning technical work.',
    'Pressing trigger clip: backward pass, jump, force play wide.',
    'Aerial duel work. Better starting position means less wrestling.',
    'Two assists and a lesson in patience from the weekend.',
    'Private clip for scout review: movement between center back and fullback.',
    'Video: ball mastery warmup before tactical work.',
    'Training gallery from the open showcase.',
  ];

  const postOwners = [
    'tarek_hassan',
    'milo_grant',
    'leo_fischer',
    'samir_okafor',
    'diego_alvarez',
    'omar_benali',
    'noah_reed',
    'ethan_brooks',
  ];
  const videoPostIndexes = new Set([
    0, 2, 4, 7, 8, 9, 12, 14, 16, 18, 19, 20, 21,
  ]);

  const getPostImage = (postIndex: number, offset = 0): string => {
    const overrideAsset = postAssetOverrides[postIndex]?.[offset];
    if (overrideAsset) {
      const overrideUrl = ctx.media.postImagesByAsset[overrideAsset];
      if (!overrideUrl) {
        throw new Error(
          `Development seed post image asset is missing: assets/pics/${overrideAsset}`,
        );
      }
      return overrideUrl;
    }

    return ctx.media.postImages[
      (postIndex + offset) % ctx.media.postImages.length
    ];
  };

  for (let index = 0; index < captions.length; index += 1) {
    const ownerKey = postOwners[index % postOwners.length];
    const isVideo = videoPostIndexes.has(index);
    const isMulti = index % 5 === 2;
    const post = await manager.getRepository(Post).save(
      manager.getRepository(Post).create({
        userId: ctx.users[ownerKey].id,
        user: ctx.users[ownerKey],
        caption: captions[index],
        isHighlight: isVideo || index === 12,
        engagementScore: 50 + index * 7,
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 120 + index * 31,
        sharesCount: index % 3,
        visibility: index === 19 ? 'connections' : 'public',
        musicTitle: isVideo ? 'Training Ground Ambience' : null,
        musicArtist: isVideo ? 'NxtPro Seed Audio' : null,
        musicDurationMs: isVideo ? 38000 : null,
        isReported: index === 17,
      }),
    );
    ctx.posts.push(post);

    const attachmentUrls = isVideo
      ? [ctx.media.videos[index % ctx.media.videos.length]]
      : isMulti
        ? [
            getPostImage(index, 0),
            getPostImage(index, 1),
            getPostImage(index, 2),
          ]
        : [getPostImage(index)];

    for (const [position, url] of attachmentUrls.entries()) {
      const contentType = url.endsWith('.mp4') ? 'video' : 'image';
      const attachment = await manager.getRepository(Attachment).save(
        manager.getRepository(Attachment).create({
          postId: post.id,
          post,
          contentType,
          url,
          position,
        }),
      );
      ctx.attachments.push(attachment);

      await manager.getRepository(MediaModeration).save(
        manager.getRepository(MediaModeration).create({
          attachmentId: attachment.id,
          attachment,
          status: index === 17 ? 'processing' : 'completed',
          result:
            index === 17
              ? {
                  seed: 'dev-seed',
                  reason: 'Queued example for moderation UI.',
                }
              : { seed: 'dev-seed', safeForWork: true, footballRelevant: true },
          processedAt: index === 17 ? undefined : daysAgo(1),
        }),
      );

      if (contentType === 'video') {
        const video = await manager.getRepository(Video).save(
          manager.getRepository(Video).create({
            id: attachment.id,
            attachment,
            videoThumbnailUrl: null,
            videoDuration: 24 + (index % 6) * 7,
          }),
        );
        ctx.videos.push(video);

        await manager.getRepository(VideoSkillAnalysis).save(
          manager.getRepository(VideoSkillAnalysis).create({
            videoId: video.id,
            video,
            status: index === 20 ? 'queued' : 'completed',
            aiScore:
              index === 20
                ? {}
                : {
                    overall: 78 + (index % 10),
                    movement: 82,
                    technique: 80,
                    seed: 'dev-seed',
                  },
            analysisVersion: 'dev-seed-v1',
            processedAt: index === 20 ? undefined : daysAgo(1),
          }),
        );
      }
    }
  }

  ctx.counts.posts = ctx.posts.length;
  ctx.counts.attachments = ctx.attachments.length;
  ctx.counts.videos = ctx.videos.length;
}

async function seedEngagement(queryRunner: QueryRunner, ctx: SeedContext) {
  const manager = queryRunner.manager;
  let likes = 0;
  let comments = 0;
  let bookmarks = 0;
  const activeSeedUserKeys = allAccounts
    .filter(account => (account.status ?? 'active') === 'active')
    .map(account => account.key);

  for (const [postIndex, post] of ctx.posts.entries()) {
    const likerKeys = activeSeedUserKeys
      .filter(key => ctx.users[key].id !== post.userId)
      .slice(postIndex % 4, (postIndex % 4) + 4);

    for (const key of likerKeys) {
      await manager.getRepository(Like).save(
        manager.getRepository(Like).create({
          userId: ctx.users[key].id,
          postId: post.id,
          user: ctx.users[key],
          post,
        }),
      );
      likes += 1;
    }

    const commentAuthors = likerKeys.slice(0, 2);
    for (const [commentIndex, key] of commentAuthors.entries()) {
      await manager.getRepository(Comment).save(
        manager.getRepository(Comment).create({
          userId: ctx.users[key].id,
          postId: post.id,
          user: ctx.users[key],
          post,
          content:
            commentIndex === 0
              ? 'Clean detail in that clip. The first touch buys the next action.'
              : 'This is exactly the kind of repeatable action scouts can evaluate.',
          isReported: false,
        }),
      );
      comments += 1;
    }

    if (postIndex % 3 === 0) {
      const user =
        ctx.users[
          activeSeedUserKeys[(postIndex + 5) % activeSeedUserKeys.length]
        ];
      await manager.getRepository(Bookmark).save(
        manager.getRepository(Bookmark).create({
          userId: user.id,
          user,
          bookmarkableId: post.id,
          bookmarkableType: 'post',
        }),
      );
      bookmarks += 1;
    }
  }

  for (const post of ctx.posts) {
    const postLikes = await manager.getRepository(Like).count({
      where: { postId: post.id },
    });
    const postComments = await manager.getRepository(Comment).count({
      where: { postId: post.id },
    });
    await manager.getRepository(Post).update(post.id, {
      likesCount: postLikes,
      commentsCount: postComments,
      engagementScore:
        post.viewsCount * 0.2 +
        postLikes * 4 +
        postComments * 6 +
        post.sharesCount * 8,
    });
  }

  for (const seed of players) {
    const userId = ctx.users[seed.key].id;
    const totalPosts = ctx.posts.filter(post => post.userId === userId).length;
    const totalLikes = ctx.posts
      .filter(post => post.userId === userId)
      .reduce((sum, post) => sum + post.likesCount, 0);
    const totalViews = ctx.posts
      .filter(post => post.userId === userId)
      .reduce((sum, post) => sum + post.viewsCount, 0);
    await manager.getRepository(PlayerProfile).update(userId, {
      totalPosts,
      totalLikes,
      totalViews,
    });
  }

  ctx.counts.likes = likes;
  ctx.counts.comments = comments;
  ctx.counts.bookmarks = bookmarks;
}

async function seedConnectionsAndChats(
  queryRunner: QueryRunner,
  ctx: SeedContext,
) {
  const manager = queryRunner.manager;
  const pairs: Array<{
    player: string;
    scout: string;
    status: 'accepted' | 'pending' | 'rejected';
    initiatedBy: 'player' | 'scout';
  }> = [
    {
      player: 'tarek_hassan',
      scout: 'maya_cole',
      status: 'accepted',
      initiatedBy: 'scout',
    },
    {
      player: 'milo_grant',
      scout: 'maya_cole',
      status: 'pending',
      initiatedBy: 'player',
    },
    {
      player: 'omar_benali',
      scout: 'nabil_fares',
      status: 'accepted',
      initiatedBy: 'scout',
    },
    {
      player: 'noah_reed',
      scout: 'ella_sato',
      status: 'rejected',
      initiatedBy: 'player',
    },
    {
      player: 'samir_okafor',
      scout: 'nabil_fares',
      status: 'accepted',
      initiatedBy: 'player',
    },
  ];

  for (const pair of pairs) {
    const player = ctx.players[pair.player];
    const scout = ctx.scouts[pair.scout];
    await manager.getRepository(Connection).save(
      manager.getRepository(Connection).create({
        playerId: player.userId,
        scoutId: scout.userId,
        player,
        scout,
        status: pair.status,
        initiatedBy: pair.initiatedBy,
        requestedAt: daysAgo(12),
        respondedAt: pair.status === 'pending' ? undefined : daysAgo(10),
      }),
    );

    const chatStatus =
      pair.status === 'accepted'
        ? 'active'
        : pair.status === 'rejected'
          ? 'rejected'
          : 'pending';
    const chat = await manager.getRepository(Chat).save(
      manager.getRepository(Chat).create({
        type: 'direct',
        scout: ctx.users[pair.scout],
        player: ctx.users[pair.player],
        status: chatStatus,
        unreadCount: chatStatus === 'active' ? 1 : 0,
        lastMessageAt: daysAgo(1),
        lastMessagePreview:
          chatStatus === 'rejected'
            ? 'Thanks for the context. I will keep developing and share new clips.'
            : 'I can send the full match file after training today.',
      }),
    );
    ctx.chats.push(chat);

    await manager.getRepository(ChatParticipant).save([
      manager.getRepository(ChatParticipant).create({
        chat,
        user: ctx.users[pair.scout],
        unreadCount: chatStatus === 'active' ? 1 : 0,
        status: chatStatus,
        notificationsMuted: false,
      }),
      manager.getRepository(ChatParticipant).create({
        chat,
        user: ctx.users[pair.player],
        unreadCount: 0,
        status: chatStatus,
        notificationsMuted: pair.status === 'rejected',
      }),
    ]);

    const messages = [
      {
        sender: pair.initiatedBy === 'player' ? pair.player : pair.scout,
        content:
          pair.initiatedBy === 'player'
            ? 'Hi, I added two new match clips and would value your feedback.'
            : 'I liked your latest clip. Are you available for a short intro call this week?',
      },
      {
        sender: pair.initiatedBy === 'player' ? pair.scout : pair.player,
        content:
          pair.status === 'rejected'
            ? 'Thanks for reaching out. This profile is not the right fit for my current shortlist.'
            : 'Absolutely. I can share minutes, training schedule, and the full match file.',
      },
      {
        sender: pair.player,
        content:
          pair.status === 'pending'
            ? 'I am available after 18:00 local time and can send references.'
            : 'I can send the full match file after training today.',
      },
    ];

    for (const [index, message] of messages.entries()) {
      await manager.getRepository(Message).save(
        manager.getRepository(Message).create({
          chat,
          sender: ctx.users[message.sender],
          content: message.content,
          messageType: 'text',
          attachmentUrl: null,
          readAt: index < 2 ? daysAgo(1) : null,
        }),
      );
    }
  }

  await manager.getRepository(PlayerConnection).save([
    manager.getRepository(PlayerConnection).create({
      requesterId: ctx.players.tarek_hassan.userId,
      addresseeId: ctx.players.diego_alvarez.userId,
      requester: ctx.players.tarek_hassan,
      addressee: ctx.players.diego_alvarez,
      status: 'accepted',
      requestedAt: daysAgo(18),
      respondedAt: daysAgo(17),
    }),
    manager.getRepository(PlayerConnection).create({
      requesterId: ctx.players.noah_reed.userId,
      addresseeId: ctx.players.leo_fischer.userId,
      requester: ctx.players.noah_reed,
      addressee: ctx.players.leo_fischer,
      status: 'pending',
      requestedAt: daysAgo(2),
    }),
  ]);

  ctx.counts.connections = pairs.length;
  ctx.counts.player_connections = 2;
  ctx.counts.chats = ctx.chats.length;
  ctx.counts.messages = pairs.length * 3;
}

async function seedRecommendationExclusions(
  queryRunner: QueryRunner,
  ctx: SeedContext,
) {
  const manager = queryRunner.manager;
  const blocked = [{ scoutKey: 'maya_cole', playerKey: 'leo_fischer' }];
  const muted = [{ scoutKey: 'maya_cole', playerKey: 'noah_reed' }];

  for (const relation of blocked) {
    await manager.getRepository(Block).save(
      manager.getRepository(Block).create({
        blockerId: ctx.scouts[relation.scoutKey].userId,
        blockedId: ctx.players[relation.playerKey].userId,
        blocker: ctx.users[relation.scoutKey],
        blocked: ctx.users[relation.playerKey],
      }),
    );
  }

  for (const relation of muted) {
    await manager.getRepository(Mute).save(
      manager.getRepository(Mute).create({
        muterId: ctx.scouts[relation.scoutKey].userId,
        mutedId: ctx.players[relation.playerKey].userId,
        muter: ctx.users[relation.scoutKey],
        muted: ctx.users[relation.playerKey],
      }),
    );
  }

  ctx.recommendationExclusions = { blocked, muted };
  ctx.counts.blocks = blocked.length;
  ctx.counts.mutes = muted.length;
}

async function seedEvents(queryRunner: QueryRunner, ctx: SeedContext) {
  const manager = queryRunner.manager;
  const venueSeeds = [
    {
      name: 'Riverside Performance Park',
      address: '100 Training Loop',
      city: 'Austin',
      country: 'United States',
      capacity: 2200,
    },
    {
      name: 'North Gate Football Centre',
      address: '14 Academy Road',
      city: 'Toronto',
      country: 'Canada',
      capacity: 1800,
    },
    {
      name: 'Cairo Elite Sports Complex',
      address: '22 Scout Avenue',
      city: 'Cairo',
      country: 'Egypt',
      capacity: 3200,
    },
  ];

  for (const [index, venueSeed] of venueSeeds.entries()) {
    const venue = await manager.getRepository(Venue).save(
      manager.getRepository(Venue).create({
        ...venueSeed,
        contactPhone: `+1555040100${index + 1}`,
        contactEmail: `venue.${index + 1}@${SEED_DOMAIN}`,
        images: [ctx.media.venueImages[index]],
      }),
    );
    ctx.venues.push(venue);
  }

  const eventSeeds = [
    {
      title: 'NxtPro Summer Showcase',
      eventType: 'trial' as const,
      organizer: 'admin_ops',
      organizerType: 'admin' as const,
      status: 'approved' as const,
      venueIndex: 0,
      days: 14,
      positions: ['Striker', 'Winger', 'Attacking Midfielder'],
    },
    {
      title: 'North Region U21 Scout Day',
      eventType: 'tournament' as const,
      organizer: 'maya_cole',
      organizerType: 'scout' as const,
      status: 'approved' as const,
      venueIndex: 1,
      days: 28,
      positions: ['Fullback', 'Central Midfielder', 'Center Back'],
    },
    {
      title: 'Goalkeeper Distribution Lab',
      eventType: 'workshop' as const,
      organizer: 'nabil_fares',
      organizerType: 'scout' as const,
      status: 'pending_approval' as const,
      venueIndex: 2,
      days: 35,
      positions: ['Goalkeeper'],
    },
    {
      title: 'Video Scouting Review Night',
      eventType: 'workshop' as const,
      organizer: 'ella_sato',
      organizerType: 'scout' as const,
      status: 'rejected' as const,
      venueIndex: 0,
      days: 45,
      positions: ['Left Back', 'Defensive Midfielder'],
    },
  ];

  for (const [index, seed] of eventSeeds.entries()) {
    const startDate = daysFromNow(seed.days, 9);
    const endDate = daysFromNow(seed.days, 17);
    const event = await manager.getRepository(Event).save(
      manager.getRepository(Event).create({
        title: seed.title,
        description:
          'Development event seeded for local testing with realistic requirements, registration states, and organizer workflow.',
        eventType: seed.eventType,
        startDate,
        endDate,
        startTime: '09:00:00',
        endTime: '17:00:00',
        status: seed.status,
        organizer: ctx.users[seed.organizer],
        organizerType: seed.organizerType,
        createdBy: ctx.users[seed.organizer],
        approvedBy:
          seed.status === 'approved' ? ctx.users.admin_ops : undefined,
        approvedAt: seed.status === 'approved' ? daysAgo(3) : undefined,
        rejectionReason:
          seed.status === 'rejected'
            ? 'Organizer needs to provide a clearer safety and staffing plan.'
            : undefined,
        positionsTargeted: seed.positions,
        tags: ['development', 'scouting', 'verified-clips'],
        maxParticipants: 48,
        participantCount: 0,
        registrationDeadline: daysFromNow(seed.days - 3, 23),
        entryFee: index === 0 ? 0 : 25,
        schedule: [
          { time: '09:00', label: 'Check-in and dynamic warmup' },
          { time: '10:30', label: 'Position-specific technical stations' },
          { time: '14:00', label: 'Small-sided evaluation matches' },
        ],
        prizes: ['Verified scout report', 'Featured profile boost'],
        requirements: [
          'Bring boots and shin guards',
          'Upload one recent match clip',
        ],
        coverImageUrl: ctx.media.eventCovers[index],
        venue: ctx.venues[seed.venueIndex],
      }),
    );
    ctx.events.push(event);
  }

  const registrationSeeds = [
    ['tarek_hassan', 0, 'approved', true],
    ['milo_grant', 0, 'pending', false],
    ['diego_alvarez', 0, 'approved', false],
    ['noah_reed', 1, 'approved', false],
    ['leo_fischer', 1, 'pending', false],
    ['omar_benali', 2, 'approved', false],
    ['samir_okafor', 1, 'rejected', false],
  ] as const;

  for (const [playerKey, eventIndex, status, attended] of registrationSeeds) {
    await manager.getRepository(EventRegistration).save(
      manager.getRepository(EventRegistration).create({
        event: ctx.events[eventIndex],
        player: ctx.players[playerKey],
        status,
        registeredAt: daysAgo(4),
        cancelled: false,
        attended,
      }),
    );
  }

  for (const event of ctx.events) {
    const participantCount = await manager
      .getRepository(EventRegistration)
      .count({
        where: {
          event: { id: event.id },
          status: 'approved',
          cancelled: false,
        },
      });
    await manager.getRepository(Event).update(event.id, { participantCount });
  }

  ctx.counts.venues = ctx.venues.length;
  ctx.counts.events = ctx.events.length;
  ctx.counts.event_registrations = registrationSeeds.length;
}

async function seedNotificationsReportsAndAi(
  queryRunner: QueryRunner,
  ctx: SeedContext,
) {
  const manager = queryRunner.manager;

  const notifications = [
    {
      user: 'tarek_hassan',
      title: 'Scout viewed your profile',
      message: 'Maya Cole saved your attacking midfielder profile.',
      type: 'marketing' as const,
      referenceId: ctx.users.maya_cole.id,
      readAt: null,
    },
    {
      user: 'milo_grant',
      title: 'Chat request pending',
      message: 'Your message to Maya Cole is waiting for review.',
      type: 'message' as const,
      referenceId: ctx.chats[1].id,
      readAt: null,
    },
    {
      user: 'omar_benali',
      title: 'Skill score updated',
      message: 'Your goalkeeper distribution score moved to 79.',
      type: 'skill_score' as const,
      referenceId: ctx.players.omar_benali.userId,
      readAt: daysAgo(1),
    },
    {
      user: 'maya_cole',
      title: 'New connection request',
      message: 'Milo Grant requested to connect after the showcase clip.',
      type: 'connection_request' as const,
      referenceId: ctx.players.milo_grant.userId,
      readAt: null,
    },
    {
      user: 'admin_moderation',
      title: 'Moderation item needs review',
      message: 'A seeded post has an in-progress moderation example.',
      type: 'verification' as const,
      referenceId: ctx.posts[17].id,
      readAt: null,
    },
    {
      user: 'noah_reed',
      title: 'New event nearby',
      message: 'North Region U21 Scout Day targets your position.',
      type: 'new_event' as const,
      referenceId: ctx.events[1].id,
      readAt: daysAgo(2),
    },
  ];

  await manager.getRepository(Notification).save(
    notifications.map(item =>
      manager.getRepository(Notification).create({
        user: ctx.users[item.user],
        title: item.title,
        message: item.message,
        type: item.type,
        referenceId: item.referenceId,
        readAt: item.readAt,
      }),
    ),
  );

  await manager.getRepository(Favorite).save([
    manager.getRepository(Favorite).create({
      userId: ctx.users.maya_cole.id,
      user: ctx.users.maya_cole,
      favoritedId: ctx.players.tarek_hassan.userId,
      favoritedType: 'player',
    }),
    manager.getRepository(Favorite).create({
      userId: ctx.users.tarek_hassan.id,
      user: ctx.users.tarek_hassan,
      favoritedId: ctx.scouts.maya_cole.userId,
      favoritedType: 'scout',
    }),
  ]);

  await manager.getRepository(ScoutNotes).save([
    manager.getRepository(ScoutNotes).create({
      scoutId: ctx.scouts.maya_cole.userId,
      playerId: ctx.players.tarek_hassan.userId,
      scout: ctx.scouts.maya_cole,
      player: ctx.players.tarek_hassan,
      title: 'Receives on the half-turn',
      content:
        'Consistently checks shoulder before receiving. Worth reviewing against stronger pressure.',
      isPrivate: true,
    }),
    manager.getRepository(ScoutNotes).create({
      scoutId: ctx.scouts.nabil_fares.userId,
      playerId: ctx.players.omar_benali.userId,
      scout: ctx.scouts.nabil_fares,
      player: ctx.players.omar_benali,
      title: 'Distribution profile',
      content:
        'Long pass shape is repeatable. Needs one more live match sample under a high press.',
      isPrivate: true,
    }),
  ]);

  await manager.getRepository(Report).save([
    manager.getRepository(Report).create({
      reporter: ctx.users.diego_alvarez,
      type: 'content',
      title: 'Clip context unclear',
      description:
        'Seeded moderation example: a user reports that a clip caption lacks context.',
      status: 'under_review',
      severity: 'low',
      reportedType: 'post',
      reportedId: ctx.posts[17].id,
      metadata: { seed: 'dev-seed', screen: 'admin-reports' },
    }),
    manager.getRepository(Report).create({
      reporter: ctx.users.noah_reed,
      type: 'message',
      title: 'Message tone review',
      description:
        'Seeded dismissed report for testing resolved moderation history.',
      status: 'dismissed',
      severity: 'medium',
      reportedType: 'chat',
      reportedId: ctx.chats[3].id,
      resolvedBy: ctx.users.admin_moderation,
      resolutionNotes: 'Reviewed synthetic seed chat. No action required.',
      resolvedAt: daysAgo(1),
      metadata: { seed: 'dev-seed', screen: 'admin-reports' },
    }),
  ]);

  await manager.getRepository(AiSkillScoreJob).save([
    manager.getRepository(AiSkillScoreJob).create({
      playerId: ctx.players.tarek_hassan.userId,
      requestedBy: ctx.users.tarek_hassan.id,
      queueJobId: 'dev-seed-job-passing-001',
      skillKey: 'passing',
      displayName: 'Passing',
      profileSkillKey: 'passing',
      serviceName: 'ai-skills',
      status: 'completed',
      input: { seed: 'dev-seed', source: 'highlight upload' },
      result: {
        score: 88,
        confidence: 0.91,
        summary: 'Excellent tempo control.',
      },
      score: 88,
      confidence: 0.91,
      modelVersion: 'dev-seed-v1',
      summary: 'Excellent tempo control and disguised passing angles.',
      completedAt: daysAgo(2),
      player: ctx.players.tarek_hassan,
      requestedByUser: ctx.users.tarek_hassan,
    }),
    manager.getRepository(AiSkillScoreJob).create({
      playerId: ctx.players.diego_alvarez.userId,
      requestedBy: ctx.users.diego_alvarez.id,
      queueJobId: 'dev-seed-job-dribbling-001',
      skillKey: 'dribbling',
      displayName: 'Dribbling',
      profileSkillKey: 'dribbling',
      serviceName: 'ai-skills',
      status: 'processing',
      input: { seed: 'dev-seed', source: 'mobile upload' },
      result: null,
      score: null,
      confidence: null,
      modelVersion: null,
      summary: null,
      completedAt: null,
      player: ctx.players.diego_alvarez,
      requestedByUser: ctx.users.diego_alvarez,
    }),
    manager.getRepository(AiSkillScoreJob).create({
      playerId: ctx.players.noah_reed.userId,
      requestedBy: ctx.users.noah_reed.id,
      queueJobId: 'dev-seed-job-pace-001',
      skillKey: 'pace',
      displayName: 'Pace',
      profileSkillKey: 'pace',
      serviceName: 'ai-skills',
      status: 'failed',
      input: { seed: 'dev-seed', source: 'short clip' },
      result: null,
      score: null,
      confidence: null,
      modelVersion: 'dev-seed-v1',
      summary: null,
      failureReason: 'Seeded example: video too short for stable pace scoring.',
      completedAt: daysAgo(1),
      player: ctx.players.noah_reed,
      requestedByUser: ctx.users.noah_reed,
    }),
  ]);

  await manager.getRepository(AuditLog).save([
    manager.getRepository(AuditLog).create({
      actor: ctx.users.admin_ops,
      action: 'event_approved',
      entityType: 'event',
      entityId: ctx.events[0].id,
      description: 'Approved seeded local showcase event.',
      oldStatus: 'pending_approval',
      newStatus: 'approved',
      metadata: { seed: 'dev-seed' },
      ipAddress: '127.0.0.1',
      userAgent: 'NxtPro Dev Seed',
    }),
    manager.getRepository(AuditLog).create({
      actor: ctx.users.admin_moderation,
      action: 'report_created',
      entityType: 'report',
      entityId: ctx.posts[17].id,
      description: 'Seeded moderation queue example.',
      metadata: { seed: 'dev-seed' },
      ipAddress: '127.0.0.1',
      userAgent: 'NxtPro Dev Seed',
    }),
  ]);

  ctx.counts.notifications = notifications.length;
  ctx.counts.favorites = 2;
  ctx.counts.scout_notes = 2;
  ctx.counts.reports = 2;
  ctx.counts.ai_skill_score_jobs = 3;
  ctx.counts.audit_logs = 2;
}

async function seedAll(queryRunner: QueryRunner): Promise<SeedContext> {
  const media = await createSeedMedia();
  const seededUsers = await seedUsers(queryRunner, media);
  const ctx: SeedContext = {
    users: seededUsers.users,
    players: seededUsers.playerProfiles,
    scouts: seededUsers.scoutProfiles,
    posts: [],
    attachments: [],
    videos: [],
    chats: [],
    events: [],
    venues: [],
    recommendationExclusions: {
      blocked: [],
      muted: [],
    },
    media,
    counts: {
      users: allAccounts.length,
      player_profiles: players.length,
      scout_profiles: scouts.length,
      user_notification_preferences: allAccounts.length,
    },
  };

  await seedPlayerProfileDetails(queryRunner, ctx);
  await seedPosts(queryRunner, ctx);
  await seedEngagement(queryRunner, ctx);
  await seedConnectionsAndChats(queryRunner, ctx);
  await seedRecommendationExclusions(queryRunner, ctx);
  await seedEvents(queryRunner, ctx);
  await seedNotificationsReportsAndAi(queryRunner, ctx);

  return ctx;
}

async function writeSeedOutput(ctx: SeedContext) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const accounts = allAccounts.map(account => ({
    key: account.key,
    email: account.email,
    username: account.username,
    password: SEED_PASSWORD,
    role: account.role,
    status: account.status ?? 'active',
    userId: ctx.users[account.key].id,
    profileId:
      account.role === 'player'
        ? ctx.players[account.key].userId
        : account.role === 'scout'
          ? ctx.scouts[account.key].userId
          : null,
  }));

  await fs.writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seed: 'dev-seed',
        password: SEED_PASSWORD,
        accounts,
        smokeTestIds: {
          featuredPlayerId: ctx.players.tarek_hassan.userId,
          scoutId: ctx.scouts.maya_cole.userId,
          blockedPlayerId: ctx.players.leo_fischer.userId,
          mutedPlayerId: ctx.players.noah_reed.userId,
          bannedPlayerId: ctx.players.ethan_brooks.userId,
          publicPostId: ctx.posts[0].id,
          videoPostId: ctx.posts.find(post => post.isHighlight)?.id,
          activeChatId: ctx.chats[0].id,
          pendingChatId: ctx.chats[1].id,
          eventId: ctx.events[0].id,
          reportPostId: ctx.posts[17].id,
        },
        media: {
          uploadDir: uploadConfig().localUploadDir,
          generatedFiles: ctx.media.files.map(file => basename(file)),
          videoSources: ctx.media.videoSources,
          note: 'Uses only monorepo root assets/pics and assets/videos, copied into the normal uploads folders. If root assets are unavailable, seeding fails instead of falling back to generated or bundled media.',
        },
        aiScoringSkillGaps: buildPlayerSkillGapSummary(),
        recommendationExclusions: {
          blocked: ctx.recommendationExclusions.blocked.map(relation => ({
            scout: relation.scoutKey,
            scoutId: ctx.scouts[relation.scoutKey].userId,
            player: relation.playerKey,
            playerId: ctx.players[relation.playerKey].userId,
          })),
          muted: ctx.recommendationExclusions.muted.map(relation => ({
            scout: relation.scoutKey,
            scoutId: ctx.scouts[relation.scoutKey].userId,
            player: relation.playerKey,
            playerId: ctx.players[relation.playerKey].userId,
          })),
        },
        counts: ctx.counts,
      },
      null,
      2,
    )}\n`,
  );
}

async function runUndoOnly(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const summary = await undoSeedData(queryRunner);
    await queryRunner.commitTransaction();
    const mediaDeleted = await deleteSeedMedia();
    console.log('Dev seed undo complete.');
    console.table({ ...summary, media_files: mediaDeleted });
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function runSeed(skipInitialUndo = false): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const undoSummary = skipInitialUndo ? {} : await undoSeedData(queryRunner);
    const ctx = await seedAll(queryRunner);
    await queryRunner.commitTransaction();
    await writeSeedOutput(ctx);
    console.log('Dev seed complete.');
    console.log(`Accounts written to ${OUTPUT_FILE}`);
    console.table({
      removed_before_seed: Object.values(undoSummary).reduce(
        (sum, value) => sum + value,
        0,
      ),
      ...ctx.counts,
      media_files: ctx.media.files.length,
    });
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function main(): Promise<void> {
  requireDevSeedAllowed();
  const mode = assertMode(process.argv[2]);

  await AppDataSource.initialize();

  try {
    if (mode === 'undo') {
      await runUndoOnly();
      return;
    }

    if (mode === 'reset') {
      await runUndoOnly();
      await runSeed(true);
      return;
    }

    await runSeed();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
