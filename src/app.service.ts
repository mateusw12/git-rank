import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { service: string; status: string; docs: string } {
    return {
      service: 'git-rank-api',
      status: 'ok',
      docs: '/docs',
    };
  }
}
