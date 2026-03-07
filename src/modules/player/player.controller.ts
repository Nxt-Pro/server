import { Controller, Get, Query } from '@nestjs/common';

import { FeaturedQueryDto } from './dto';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
  private readonly playerService: PlayerService;

  constructor(playerService: PlayerService) {
    this.playerService = playerService;
  }

  /**
   * GET /api/player/featured
   */
  @Get('featured')
  async getFeatured(@Query() query: FeaturedQueryDto) {
    return this.playerService.getFeaturedPlayers(query.limit);
  }
}
