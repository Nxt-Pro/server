import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { RespondConnectionDto } from './dto';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('player')
export class PlayerConnectionController {
  private readonly connectionsService: ConnectionsService;

  constructor(connectionsService: ConnectionsService) {
    this.connectionsService = connectionsService;
  }

  /** Player connects to scout */
  @Post('scout/:scout_id/connect')
  connectToScout(
    @Param('scout_id') scoutId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.connectionsService.connectPlayerToScout(user.sub, scoutId);
  }

  /** Player connects to another player */
  @Post('player/:player_id/connect')
  connectToPlayer(
    @Param('player_id') playerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.connectionsService.connectPlayerToPlayer(user.sub, playerId);
  }
}

@Controller('scout')
export class ScoutConnectionController {
  private readonly connectionsService: ConnectionsService;

  constructor(connectionsService: ConnectionsService) {
    this.connectionsService = connectionsService;
  }

  /** Scout connects to player */
  @Post('player/:player_id/connect')
  connectToPlayer(
    @Param('player_id') playerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.connectionsService.connectScoutToPlayer(user.sub, playerId);
  }
}

@Controller('player-connection')
export class PlayerConnectionRespondController {
  private readonly connectionsService: ConnectionsService;

  constructor(connectionsService: ConnectionsService) {
    this.connectionsService = connectionsService;
  }

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RespondConnectionDto,
  ) {
    return this.connectionsService.respondToPlayerConnection(id, user.sub, dto);
  }
}

@Controller('connection')
export class ConnectionRespondController {
  private readonly connectionsService: ConnectionsService;

  constructor(connectionsService: ConnectionsService) {
    this.connectionsService = connectionsService;
  }

  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RespondConnectionDto,
  ) {
    return this.connectionsService.respondToConnection(id, user.sub, dto);
  }
}

@Controller('connections')
export class ConnectionsListController {
  private readonly connectionsService: ConnectionsService;

  constructor(connectionsService: ConnectionsService) {
    this.connectionsService = connectionsService;
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.connectionsService.listConnections(user.sub);
  }
}
