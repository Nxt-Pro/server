import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import {
  HttpExceptionFilter,
  TypeOrmExceptionFilter,
  ValidationExceptionFilter,
} from './common/filters';
import { TransformInterceptor } from './common/interceptors';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './integrations/ai/ai.module';

import { JwtAuthGuard } from '@/common/guards';
import { ConfigValidatorService } from '@/common/validators';
import { configuration } from '@/config';
import { DatabaseService } from '@/database';
import { FirebaseModule } from '@/integrations/firebase/firebase.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatModule } from '@/modules/chats';
import { ConnectionsModule } from '@/modules/connections/connections.module';
import { EventsModule } from '@/modules/events';
import { HealthModule } from '@/modules/health';
import { NotificationsModule } from '@/modules/notifications';
import { PlayerModule } from '@/modules/player/player.module';
import { PostsModule } from '@/modules/posts/posts.module';
import { ProfilesModule } from '@/modules/profiles/profiles.module';
import { VenuesModule } from '@/modules/venues';

@Module({
  imports: [
    // Global Event Emitter
    EventEmitterModule.forRoot(),

    // Configuration (loads all env vars + validates)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: process.env.NODE_ENV === 'production',
      validate: config => {
        const validator = new ConfigValidatorService();
        return validator.validate(config);
      },
    }),

    // Database
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Feature modules
    AuthModule,
    PostsModule,
    ProfilesModule,
    ConnectionsModule,
    HealthModule,
    AiModule,
    AdminModule,
    PlayerModule,
    ChatModule,
    EventsModule,
    VenuesModule,
    NotificationsModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [
    DatabaseService,
    ConfigValidatorService,

    // Filters
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global guard: require JWT unless route has @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('AppModule initialized');
  }
}
