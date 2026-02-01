import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const firebaseConfig = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        // Handle newline characters in private key if loaded from env
        privateKey: this.configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      };

      if (
        !firebaseConfig.projectId ||
        !firebaseConfig.clientEmail ||
        !firebaseConfig.privateKey
      ) {
        this.logger.warn(
          'Firebase configuration missing. Notifications will not be sent.',
        );
        return;
      }

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
        });
        this.logger.log('Firebase Admin Initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error);
    }
  }

  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      if (admin.apps.length === 0) {
        this.logger.warn(
          'Firebase not initialized, skipping notification send',
        );
        return;
      }
      await admin.messaging().send({
        token,
        notification: {
          title,
          body,
        },
        data,
      });
      this.logger.log(`Notification sent to ${token.substring(0, 10)}...`);
    } catch (error) {
      this.logger.error(
        `Error sending notification to ${token.substring(0, 10)}...`,
        error,
      );
    }
  }

  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      if (admin.apps.length === 0) {
        this.logger.warn(
          'Firebase not initialized, skipping multicast notification',
        );
        return;
      }
      if (!tokens.length) return;

      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title,
          body,
        },
        data,
      });

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        this.logger.log(`Failed to send to ${response.failureCount} tokens`);
        // Here you might want to handle invalid tokens (remove them from DB)
      }
    } catch (error) {
      this.logger.error('Error sending multicast notification', error);
    }
  }
}
