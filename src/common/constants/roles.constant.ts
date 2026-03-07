export const USER_ROLES = ['player', 'scout', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REGISTRABLE_ROLES = ['player', 'scout'] as const;
export type RegistrableRole = (typeof REGISTRABLE_ROLES)[number];
