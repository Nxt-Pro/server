import { Controller, Get, Query } from '@nestjs/common';
import {
  GlobalSearchQueryDto,
  ListPlayersQueryDto,
  ListScoutsQueryDto,
} from './dto';
import { ProfilesService } from './profiles.service';
import { Public } from '@/common/decorators';

@Controller('player')
export class PlayerDiscoveryController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Public()
  @Get()
  listPlayers(@Query() query: ListPlayersQueryDto) {
    return this.profilesService.listPlayers(query);
  }
}

@Controller('scout')
export class ScoutDiscoveryController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Public()
  @Get()
  listScouts(@Query() query: ListScoutsQueryDto) {
    return this.profilesService.listScouts(query);
  }
}

@Controller('search')
export class SearchController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Public()
  @Get('global')
  globalSearch(@Query() query: GlobalSearchQueryDto) {
    return this.profilesService.globalSearch(query);
  }
}
