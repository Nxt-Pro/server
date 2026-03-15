import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PlayerProfile, ScoutProfile, User } from '@/database/entities';
import { MailModule } from '@/integrations/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PlayerProfile, ScoutProfile]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT secret is required');
        }
        const expiresInStr = config.get<string>('jwt.expiresIn', '7d');
        const match = expiresInStr.match(/^(\d+)([smhd])$/);
        const multipliers: Record<string, number> = {
          s: 1,
          m: 60,
          h: 3600,
          d: 86400,
        };
        const expiresInSeconds = match
          ? parseInt(match[1], 10) * (multipliers[match[2]] ?? 86400)
          : 604800; // default 7d
        return {
          secret,
          signOptions: { expiresIn: expiresInSeconds },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
