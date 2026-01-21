/* eslint-disable */

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
    const res = await request(app.getHttpServer()).get('/api').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('message', 'Welcome to NxtPro API');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('health', '/api/health');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
