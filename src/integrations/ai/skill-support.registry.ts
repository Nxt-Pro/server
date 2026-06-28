import { JobType, QueueName } from '@/common/enums';

export type SkillInputKind = 'single-video' | 'multi-video' | 'mixed-media';
export type AiServiceName = 'ai-skills';

export interface SkillMediaSlot {
  key: string;
  formField: string;
  required: boolean;
  mediaType: 'video' | 'image';
  aliases?: string[];
}

export interface SkillScoreMappingResult {
  score: number;
  confidence: number | null;
  summary: string | null;
  modelVersion: string | null;
  details: Record<string, unknown>;
}

export interface SkillSupportEntry {
  skillKey: string;
  aliases: string[];
  displayName: string;
  requiredInputType: SkillInputKind;
  allowedMediaTypes: string[];
  serviceName: AiServiceName;
  endpoint: string;
  timeoutMsEnv: string;
  queueName: QueueName;
  jobType: JobType;
  profileSkillField: string;
  requiresHeightCm: boolean;
  mediaSlots: SkillMediaSlot[];
  mapResult: (raw: unknown) => SkillScoreMappingResult;
}

const clampScore = (value: number): number =>
  Math.max(0, Math.min(99, Math.round(value)));

const readNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const findNumber = (root: unknown, aliases: string[]): number | null => {
  const aliasSet = new Set(aliases.map(alias => alias.toLowerCase()));
  let found: number | null = null;

  const walk = (node: unknown) => {
    if (found !== null || node == null) return;
    if (typeof node === 'string') {
      try {
        walk(JSON.parse(node));
      } catch {
        return;
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isRecord(node)) return;

    for (const [key, value] of Object.entries(node)) {
      if (aliasSet.has(key.toLowerCase())) {
        const numberValue = readNumber(value);
        if (numberValue !== null) {
          found = numberValue;
          return;
        }
      }
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  };

  walk(root);
  return found;
};

const findString = (root: unknown, aliases: string[]): string | null => {
  const aliasSet = new Set(aliases.map(alias => alias.toLowerCase()));
  if (!isRecord(root)) return null;
  for (const [key, value] of Object.entries(root)) {
    if (aliasSet.has(key.toLowerCase()) && value != null) {
      const text =
        typeof value === 'string'
          ? value.trim()
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : '';
      return text || null;
    }
  }
  return null;
};

const detailsFrom = (raw: unknown): Record<string, unknown> =>
  isRecord(raw) ? raw : { raw };

const modelVersionFrom = (raw: unknown): string | null =>
  findString(raw, ['modelVersion', 'model_version', 'analysisVersion']);

const mapPaceResult = (raw: unknown): SkillScoreMappingResult => {
  const explicitScore = findNumber(raw, ['score', 'pace_score', 'paceScore']);
  const averageSpeed = findNumber(raw, [
    'average_speed_kmh',
    'avg_speed_kmh',
    'averageSpeedKmh',
  ]);
  const sourceScore =
    explicitScore ?? (averageSpeed == null ? null : 28 + averageSpeed * 2.4);
  if (sourceScore == null) {
    throw new Error('AI pace response did not include scoreable speed data');
  }
  const score = clampScore(sourceScore);
  const distance = findNumber(raw, [
    'total_distance_covered',
    'total_distance_m',
    'totalDistanceCovered',
  ]);
  return {
    score,
    confidence: findNumber(raw, ['confidence']),
    summary:
      averageSpeed == null
        ? `Pace scored at ${score}.`
        : `Average speed ${averageSpeed.toFixed(2)} km/h, pace score ${score}.`,
    modelVersion: modelVersionFrom(raw),
    details: {
      ...detailsFrom(raw),
      average_speed_kmh: averageSpeed,
      total_distance_covered: distance,
      mapped_score: score,
    },
  };
};

const mapPassingResult = (raw: unknown): SkillScoreMappingResult => {
  const average = findNumber(raw, ['average_score', 'averageScore', 'score']);
  if (average == null) {
    throw new Error('AI passing response did not include an average score');
  }
  const normalized = average <= 1 ? average * 99 : average;
  const score = clampScore(normalized);
  const passes = findNumber(raw, ['completed_passes', 'completedPasses']);
  return {
    score,
    confidence: findNumber(raw, ['confidence']),
    summary:
      passes == null
        ? `Passing score ${score}.`
        : `${passes} completed passes, passing score ${score}.`,
    modelVersion: modelVersionFrom(raw),
    details: { ...detailsFrom(raw), mapped_score: score },
  };
};

const mapShootingResult = (raw: unknown): SkillScoreMappingResult => {
  const quality = findNumber(raw, ['quality_score', 'qualityScore', 'score']);
  if (quality == null) {
    throw new Error('AI shooting response did not include a quality score');
  }
  const score = clampScore(quality);
  const outcome = findString(raw, ['outcome']);
  const zone = findString(raw, ['target_zone', 'targetZone']);
  return {
    score,
    confidence: findNumber(raw, ['tracking_confidence', 'confidence']),
    summary: [outcome, zone].filter(Boolean).length
      ? `Shot ${outcome ?? 'analyzed'} in ${zone ?? 'target zone'}, score ${score}.`
      : `Shooting score ${score}.`,
    modelVersion: modelVersionFrom(raw),
    details: { ...detailsFrom(raw), mapped_score: score },
  };
};

const mapDribblingResult = (raw: unknown): SkillScoreMappingResult => {
  const rawScore = findNumber(raw, [
    'dribbling_score',
    'dribblingScore',
    'score',
  ]);
  if (rawScore == null) {
    throw new Error('AI dribbling response did not include a dribbling score');
  }
  const score = clampScore(rawScore);
  return {
    score,
    confidence: findNumber(raw, ['confidence']),
    summary: `Dribbling score ${score}.`,
    modelVersion: modelVersionFrom(raw),
    details: { ...detailsFrom(raw), mapped_score: score },
  };
};

const mapPhysicalResult = (raw: unknown): SkillScoreMappingResult => {
  const rawScore = findNumber(raw, ['final_score', 'finalScore', 'score']);
  if (rawScore == null) {
    throw new Error('AI physical response did not include a final score');
  }
  const score = clampScore(rawScore);
  return {
    score,
    confidence: findNumber(raw, ['confidence']),
    summary: `Physical score ${score}.`,
    modelVersion: modelVersionFrom(raw),
    details: { ...detailsFrom(raw), mapped_score: score },
  };
};

export const SKILL_SUPPORT_REGISTRY: SkillSupportEntry[] = [
  {
    skillKey: 'pace',
    aliases: ['pace', 'speed'],
    displayName: 'Pace',
    requiredInputType: 'single-video',
    allowedMediaTypes: ['video/'],
    serviceName: 'ai-skills',
    endpoint: '/api/pace/analyze',
    timeoutMsEnv: 'AI_SERVICE_TIMEOUT_MS',
    queueName: QueueName.SKILL_ANALYSIS,
    jobType: JobType.SKILL_SCORING,
    profileSkillField: 'pace',
    requiresHeightCm: true,
    mediaSlots: [
      {
        key: 'pace',
        formField: 'video',
        required: true,
        mediaType: 'video',
        aliases: ['generic', 'speed'],
      },
    ],
    mapResult: mapPaceResult,
  },
  {
    skillKey: 'passing',
    aliases: ['passing'],
    displayName: 'Passing',
    requiredInputType: 'single-video',
    allowedMediaTypes: ['video/'],
    serviceName: 'ai-skills',
    endpoint: '/api/passing/analyze',
    timeoutMsEnv: 'AI_SERVICE_TIMEOUT_MS',
    queueName: QueueName.SKILL_ANALYSIS,
    jobType: JobType.SKILL_SCORING,
    profileSkillField: 'passing',
    requiresHeightCm: false,
    mediaSlots: [
      {
        key: 'passing',
        formField: 'video',
        required: true,
        mediaType: 'video',
        aliases: ['generic'],
      },
    ],
    mapResult: mapPassingResult,
  },
  {
    skillKey: 'shooting',
    aliases: ['shooting', 'finishing'],
    displayName: 'Shooting',
    requiredInputType: 'single-video',
    allowedMediaTypes: ['video/'],
    serviceName: 'ai-skills',
    endpoint: '/api/shooting/analyze',
    timeoutMsEnv: 'AI_SERVICE_TIMEOUT_MS',
    queueName: QueueName.SKILL_ANALYSIS,
    jobType: JobType.SKILL_SCORING,
    profileSkillField: 'shooting',
    requiresHeightCm: false,
    mediaSlots: [
      {
        key: 'shooting',
        formField: 'video',
        required: true,
        mediaType: 'video',
        aliases: ['finishing', 'generic'],
      },
    ],
    mapResult: mapShootingResult,
  },
  {
    skillKey: 'dribbling',
    aliases: ['dribbling'],
    displayName: 'Dribbling',
    requiredInputType: 'multi-video',
    allowedMediaTypes: ['video/'],
    serviceName: 'ai-skills',
    endpoint: '/api/dribbling/batch',
    timeoutMsEnv: 'AI_SERVICE_TIMEOUT_MS',
    queueName: QueueName.SKILL_ANALYSIS,
    jobType: JobType.SKILL_SCORING,
    profileSkillField: 'dribbling',
    requiresHeightCm: false,
    mediaSlots: [
      {
        key: 'slalom',
        formField: 'slalom_video',
        required: true,
        mediaType: 'video',
      },
      {
        key: 'figure8',
        formField: 'figure8_video',
        required: true,
        mediaType: 'video',
        aliases: ['figure-8'],
      },
    ],
    mapResult: mapDribblingResult,
  },
  {
    skillKey: 'physical',
    aliases: ['physical'],
    displayName: 'Physical',
    requiredInputType: 'mixed-media',
    allowedMediaTypes: ['video/', 'image/'],
    serviceName: 'ai-skills',
    endpoint: '/api/physical/batch',
    timeoutMsEnv: 'AI_SERVICE_TIMEOUT_MS',
    queueName: QueueName.SKILL_ANALYSIS,
    jobType: JobType.SKILL_SCORING,
    profileSkillField: 'physical',
    requiresHeightCm: true,
    mediaSlots: [
      {
        key: 'high-knees',
        formField: 'high_knees_video',
        required: true,
        mediaType: 'video',
        aliases: ['high_knees'],
      },
      {
        key: 'jump',
        formField: 'jump_video',
        required: true,
        mediaType: 'video',
      },
      {
        key: 'agility',
        formField: 'agility_video',
        required: true,
        mediaType: 'video',
      },
      {
        key: 'burpees',
        formField: 'burpees_video',
        required: true,
        mediaType: 'video',
      },
      {
        key: 'archetype',
        formField: 'archetype_image',
        required: true,
        mediaType: 'image',
      },
    ],
    mapResult: mapPhysicalResult,
  },
];

export const findSupportedSkill = (skill: string): SkillSupportEntry | null => {
  const normalized = skill.trim().toLowerCase();
  return (
    SKILL_SUPPORT_REGISTRY.find(
      entry =>
        entry.skillKey === normalized || entry.aliases.includes(normalized),
    ) ?? null
  );
};

export const listSupportedSkillSummaries = () =>
  SKILL_SUPPORT_REGISTRY.map(entry => ({
    skillKey: entry.skillKey,
    displayName: entry.displayName,
    aliases: entry.aliases,
    requiredInputType: entry.requiredInputType,
    allowedMediaTypes: entry.allowedMediaTypes,
    serviceName: entry.serviceName,
    endpoint: entry.endpoint,
    timeout: entry.timeoutMsEnv,
    queueName: entry.queueName,
    jobType: entry.jobType,
    profileSkillField: entry.profileSkillField,
    mediaSlots: entry.mediaSlots.map(slot => ({
      key: slot.key,
      formField: slot.formField,
      required: slot.required,
      mediaType: slot.mediaType,
      aliases: slot.aliases ?? [],
    })),
  }));
