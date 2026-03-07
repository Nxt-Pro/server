import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators';

@Controller()
export class AppController {
  @Public()
  @Get()
  getWelcome() {
    return {
      message: 'Welcome to NxtPro API',
      version: '0.1.0',
      health: '/api/health',
      timestamp: new Date().toISOString(),
    };
  }
}
