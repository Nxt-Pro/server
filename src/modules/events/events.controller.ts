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
import { CreateEventDto, EventQueryDto, UpdateEventDto } from './dtos';
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
  async getOngoingEvents(@Query() query: EventQueryDto) {
    return this.eventsService.getOngoingEvents(query);
  }

  @Get()
  async getEvents(@Query() query: EventQueryDto) {
    return this.eventsService.getEvents(query);
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
}
