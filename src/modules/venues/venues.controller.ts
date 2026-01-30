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
import { CreateVenueDto } from './dtos';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  async createVenue(@Body() dto: CreateVenueDto) {
    return this.venuesService.createVenue(dto);
  }

  @Get()
  async getVenues(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.venuesService.getVenues({
      search,
      city,
      country,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get(':id')
  async getVenueById(@Param('id') venueId: string) {
    return this.venuesService.getVenueById(venueId);
  }

  @Patch(':id')
  async updateVenue(@Param('id') venueId: string, @Body() dto: UpdateVenueDto) {
    return this.venuesService.updateVenue(venueId, dto);
  }

  @Delete(':id')
  async deleteVenue(@Param('id') venueId: string) {
    await this.venuesService.deleteVenue(venueId);
    return { success: true };
  }
}
