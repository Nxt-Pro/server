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
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    return this.registrationsService.registerForEvent(eventId, user?.id);
  }

  @Get(':id/registrations')
  async getEventRegistrations(@Param('id') eventId: string) {
    return this.registrationsService.getEventRegistrations(eventId);
  }

  @Patch('registrations/:id')
  async updateRegistration(
    @CurrentUser() user: { id: string },
    @Param('id') registrationId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.registrationsService.updateRegistration(
      registrationId,
      user?.id,
      dto,
    );
  }

  @Delete('registrations/:id')
  async cancelRegistration(
    @CurrentUser() user: { id: string },
    @Param('id') registrationId: string,
  ) {
    const registration = await this.registrationsService.cancelRegistration(
      registrationId,
      user?.id,
    );
    return { success: true, registration };
  }
}
