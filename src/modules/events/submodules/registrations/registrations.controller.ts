import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateRegistrationDto } from '../../dtos';
import { RegistrationsService } from './registrations.service';
import { CurrentUser } from '@/common/decorators';

@Controller('events')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post(':id/register')
  async registerForEvent(
    @CurrentUser('sub') userId: string,
    @Param('id') eventId: string,
  ) {
    return this.registrationsService.registerForEvent(eventId, userId);
  }

  @Get(':id/registrations')
  async getEventRegistrations(@Param('id') eventId: string) {
    return this.registrationsService.getEventRegistrations(eventId);
  }

  @Patch('registrations/:id')
  async updateRegistration(
    @CurrentUser('sub') userId: string,
    @Param('id') registrationId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.registrationsService.updateRegistration(
      registrationId,
      userId,
      dto,
    );
  }

  @Delete('registrations/:id')
  async cancelRegistration(
    @CurrentUser('sub') userId: string,
    @Param('id') registrationId: string,
  ) {
    const registration = await this.registrationsService.cancelRegistration(
      registrationId,
      userId,
    );
    return { success: true, registration };
  }
}
