import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.ENABLE_BULLMQ = 'false';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appModuleImport = require('../src/app.module') as {
      AppModule: new (...args: unknown[]) => unknown;
    };
    const { AppModule } = appModuleImport;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      service: 'git-rank-api',
      status: 'ok',
      docs: '/docs',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.ENABLE_BULLMQ;
  });
});
