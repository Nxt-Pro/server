import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { RespondConnectionDto } from './dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('player')
export class PlayerConnectionController {
  constructor(private readonly connectionsService: ConnectionsService) {}

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
  constructor(private readonly connectionsService: ConnectionsService) {}

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
  constructor(private readonly connectionsService: ConnectionsService) {}

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
  constructor(private readonly connectionsService: ConnectionsService) {}

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
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.connectionsService.listConnections(user.sub);
  }
}
