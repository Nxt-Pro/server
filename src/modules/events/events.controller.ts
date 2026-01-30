import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEventDto, UpdateEventDto, UpdateRegistrationDto } from './dtos';
import { EventsService } from './events.service';
import { CurrentUser } from '@/common/decorators';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async createEvent(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user?.id, dto);
  }

  @Get('ongoing')
  async getOngoingEvents(@Query('limit') limit = 10) {
    return this.eventsService.getOngoingEvents(Number(limit));
  }

  @Get()
  async getEvents(
    @Query('eventType') eventType?: 'tournament' | 'trial' | 'workshop',
    @Query('status') status?: 'pending_approval' | 'approved' | 'rejected',
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.eventsService.getEvents({
      eventType,
      status,
      search,
      city,
      country,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get(':id')
  async getEventById(@Param('id') eventId: string) {
    return this.eventsService.getEventById(eventId);
  }

  @Patch(':id')
  async updateEvent(
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(eventId, user?.id, dto);
  }

  @Delete(':id')
  async deleteEvent(
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    await this.eventsService.deleteEvent(eventId, user?.id);
    return { success: true };
  }

  @Post(':id/approve')
  async approveEvent(
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
    @Body() body: { approve: boolean; rejectionReason?: string },
  ) {
    return this.eventsService.approveEvent(
      eventId,
      user?.id,
      body.approve,
      body.rejectionReason,
    );
  }

  // Registration endpoints
  @Post(':id/register')
  async registerForEvent(
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
  ) {
    return this.eventsService.registerForEvent(eventId, user?.id);
  }

  @Get(':id/registrations')
  async getEventRegistrations(@Param('id') eventId: string) {
    return this.eventsService.getEventRegistrations(eventId);
  }

  @Patch('registrations/:id')
  async updateRegistration(
    @Param('id') registrationId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.eventsService.updateRegistration(registrationId, dto);
  }

  @Delete('registrations/:id')
  async cancelRegistration(
    @CurrentUser() user: { id: string },
    @Param('id') registrationId: string,
  ) {
    await this.eventsService.cancelRegistration(registrationId, user?.id);
    return { success: true };
  }
}
