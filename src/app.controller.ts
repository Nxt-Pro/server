import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
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
