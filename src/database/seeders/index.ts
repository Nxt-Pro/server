import * as bcrypt from 'bcrypt';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { AppDataSource } from '@/config/data-source.config';
import { User } from '@/database/entities';

const SALT_ROUNDS = 10;

interface SuperAdminSeed {
  label: string;
  username: string;
  email: string;
  password?: string;
  passwordEnv: string;
}

function readRequiredEnv(
  key: string,
  devDefault: string,
  isProduction: boolean,
): string {
  const value = process.env[key]?.trim();

  if (value) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${key} is required in production`);
  }

  return devDefault;
}

function buildSuperAdminSeeds(): SuperAdminSeed[] {
  const isProduction = process.env.NODE_ENV === 'production';

  return [
    {
      label: 'Super Admin 1',
      username: readRequiredEnv(
        'SUPER_ADMIN_1_USERNAME',
        'superadmin1',
        isProduction,
      ),
      email: readRequiredEnv(
        'SUPER_ADMIN_1_EMAIL',
        'superadmin1@nxtpro.dev',
        isProduction,
      ).toLowerCase(),
      password: readRequiredEnv(
        'SUPER_ADMIN_1_PASSWORD',
        'ChangeMe!Admin1',
        isProduction,
      ),
      passwordEnv: 'SUPER_ADMIN_1_PASSWORD',
    },
    {
      label: 'Super Admin 2',
      username: readRequiredEnv(
        'SUPER_ADMIN_2_USERNAME',
        'superadmin2',
        isProduction,
      ),
      email: readRequiredEnv(
        'SUPER_ADMIN_2_EMAIL',
        'superadmin2@nxtpro.dev',
        isProduction,
      ).toLowerCase(),
      password: readRequiredEnv(
        'SUPER_ADMIN_2_PASSWORD',
        'ChangeMe!Admin2',
        isProduction,
      ),
      passwordEnv: 'SUPER_ADMIN_2_PASSWORD',
    },
  ];
}

async function seedSuperAdmins(): Promise<void> {
  const userRepository = AppDataSource.getRepository(User);
  const seeds = buildSuperAdminSeeds();

  for (const seed of seeds) {
    const existing = await userRepository.findOne({
      where: { email: seed.email },
      select: ['id', 'email', 'username', 'role', 'status'],
    });

    if (existing) {
      const updates: QueryDeepPartialEntity<User> = {};

      if (existing.role !== 'admin') {
        updates.role = 'admin';
      }

      if (existing.status !== 'active') {
        updates.status = 'active';
      }

      if (!existing.username && seed.username) {
        updates.username = seed.username.toLowerCase();
      }

      if (Object.keys(updates).length > 0) {
        await userRepository.update({ id: existing.id }, updates);
      }

      console.log(
        `${seed.label}: ${seed.email} already exists; role/status ensured, password preserved.`,
      );
      continue;
    }

    const passwordHash = await bcrypt.hash(seed.password!, SALT_ROUNDS);
    const admin = userRepository.create({
      email: seed.email,
      username: seed.username.toLowerCase(),
      passwordHash,
      role: 'admin',
      status: 'active',
    });

    await userRepository.save(admin);

    console.log(
      `${seed.label}: created ${seed.email}; password source ${seed.passwordEnv}.`,
    );
  }
}

async function run(): Promise<void> {
  await AppDataSource.initialize();

  try {
    await seedSuperAdmins();
  } finally {
    await AppDataSource.destroy();
  }
}

void run().catch(error => {
  console.error(error);
  process.exit(1);
});
