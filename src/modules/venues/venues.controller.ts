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
import { CreateVenueDto, UpdateVenueDto, VenueQueryDto } from './dtos';
import { VenuesService } from './venues.service';
import { CurrentUser } from '@/common/decorators';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  async createVenue(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venuesService.createVenue(userId, dto);
  }

  @Get()
  async getVenues(@Query() query: VenueQueryDto) {
    return this.venuesService.getVenues(query);
  }

  @Get(':id')
  async getVenueById(@Param('id') venueId: string) {
    return this.venuesService.getVenueById(venueId);
  }

  @Patch(':id')
  async updateVenue(
    @CurrentUser('sub') userId: string,
    @Param('id') venueId: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.updateVenue(venueId, userId, dto);
  }

  @Delete(':id')
  async deleteVenue(
    @CurrentUser('sub') userId: string,
    @Param('id') venueId: string,
  ) {
    await this.venuesService.deleteVenue(venueId, userId);
    return { success: true };
  }
}
