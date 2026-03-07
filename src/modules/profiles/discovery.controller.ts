import { Controller, Get, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import {
  ListPlayersQueryDto,
  ListScoutsQueryDto,
  GlobalSearchQueryDto,
} from './dto';
import { Public } from '@/common/decorators';

@Controller('player')
export class PlayerDiscoveryController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Public()
  @Get()
  listPlayers(@Query() query: ListPlayersQueryDto) {
    return this.profilesService.listPlayers(query);
  }
}

@Controller('scout')
export class ScoutDiscoveryController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Public()
  @Get()
  listScouts(@Query() query: ListScoutsQueryDto) {
    return this.profilesService.listScouts(query);
  }
}

@Controller('search')
export class SearchController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Public()
  @Get('global')
  globalSearch(@Query() query: GlobalSearchQueryDto) {
    return this.profilesService.globalSearch(query);
  }
}
