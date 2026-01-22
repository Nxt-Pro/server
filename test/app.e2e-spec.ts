import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { setupServer } from './../src/server';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const configService = app.get(ConfigService);
    setupServer(app, configService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api (GET) should return welcome message', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    await request(httpServer)
      .get('/api')
      .expect(200)
      .expect(response => {
        const body = response.body as {
          success: boolean;
          statusCode: number;
          data: {
            message: string;
            version: string;
            health: string;
            timestamp: string;
          };
        };

        expect(body.success).toBe(true);
        expect(body.statusCode).toBe(200);
        expect(body.data).toHaveProperty('message', 'Welcome to NxtPro API');
        expect(body.data).toHaveProperty('version');
        expect(body.data).toHaveProperty('health', '/api/health');
        expect(body.data).toHaveProperty('timestamp');
      });
  });
});
