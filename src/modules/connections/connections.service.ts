import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ConnectionResponseDto } from './dto/connection-response.dto';
import type { PlayerConnectionResponseDto } from './dto/player-connection-response.dto';
import type { RespondConnectionDto } from './dto/respond-connection.dto';
import {
  Connection,
  PlayerConnection,
  PlayerProfile,
  ScoutProfile,
  User,
} from '@/database/entities';

@Injectable()
export class ConnectionsService {
  private readonly connectionRepository: Repository<Connection>;
  private readonly playerConnectionRepository: Repository<PlayerConnection>;
  private readonly playerProfileRepository: Repository<PlayerProfile>;
  private readonly scoutProfileRepository: Repository<ScoutProfile>;
  private readonly userRepository: Repository<User>;

  constructor(
    @InjectRepository(Connection)
    connectionRepository: Repository<Connection>,
    @InjectRepository(PlayerConnection)
    playerConnectionRepository: Repository<PlayerConnection>,
    @InjectRepository(PlayerProfile)
    playerProfileRepository: Repository<PlayerProfile>,
    @InjectRepository(ScoutProfile)
    scoutProfileRepository: Repository<ScoutProfile>,
    @InjectRepository(User)
    userRepository: Repository<User>,
  ) {
    this.connectionRepository = connectionRepository;
    this.playerConnectionRepository = playerConnectionRepository;
    this.playerProfileRepository = playerProfileRepository;
    this.scoutProfileRepository = scoutProfileRepository;
    this.userRepository = userRepository;
  }

  async connectScoutToPlayer(
    scoutUserId: string,
    playerId: string,
  ): Promise<ConnectionResponseDto> {
    const scoutProfile = await this.scoutProfileRepository.findOne({
      where: { userId: scoutUserId },
    });
    if (!scoutProfile) {
      throw new ForbiddenException(
        'Only scouts can initiate connections to players',
      );
    }

    const playerProfile = await this.playerProfileRepository.findOne({
      where: { userId: playerId },
    });
    if (!playerProfile) {
      throw new NotFoundException('Player not found');
    }

    const existing = await this.connectionRepository.findOne({
      where: { playerId, scoutId: scoutUserId },
    });
    if (existing) {
      throw new ConflictException('Connection already exists');
    }

    const connection = this.connectionRepository.create({
      playerId,
      scoutId: scoutUserId,
      status: 'pending',
      initiatedBy: 'scout',
      requestedAt: new Date(),
    });
    await this.connectionRepository.save(connection);
    return this.toResponse(connection);
  }

  async connectPlayerToPlayer(
    requesterUserId: string,
    addresseeId: string,
  ): Promise<PlayerConnectionResponseDto> {
    const requesterProfile = await this.playerProfileRepository.findOne({
      where: { userId: requesterUserId },
    });
    if (!requesterProfile) {
      throw new ForbiddenException('Only players can connect to other players');
    }

    const addresseeProfile = await this.playerProfileRepository.findOne({
      where: { userId: addresseeId },
    });
    if (!addresseeProfile) {
      throw new NotFoundException('Player not found');
    }

    if (requesterUserId === addresseeId) {
      throw new ConflictException('Cannot connect to yourself');
    }

    const existing = await this.playerConnectionRepository.findOne({
      where: [
        { requesterId: requesterUserId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterUserId },
      ],
    });
    if (existing) {
      throw new ConflictException('Connection already exists');
    }

    const connection = this.playerConnectionRepository.create({
      requesterId: requesterUserId,
      addresseeId,
      status: 'pending',
      requestedAt: new Date(),
    });
    await this.playerConnectionRepository.save(connection);
    return this.toPlayerConnectionResponse(connection);
  }

  async connectPlayerToScout(
    playerUserId: string,
    scoutId: string,
  ): Promise<ConnectionResponseDto> {
    const playerProfile = await this.playerProfileRepository.findOne({
      where: { userId: playerUserId },
    });
    if (!playerProfile) {
      throw new ForbiddenException('Only players can initiate connections');
    }

    const scoutProfile = await this.scoutProfileRepository.findOne({
      where: { userId: scoutId },
    });
    if (!scoutProfile) {
      throw new NotFoundException('Scout not found');
    }

    const existing = await this.connectionRepository.findOne({
      where: { playerId: playerUserId, scoutId },
    });
    if (existing) {
      throw new ConflictException('Connection already exists');
    }

    const connection = this.connectionRepository.create({
      playerId: playerUserId,
      scoutId,
      status: 'pending',
      initiatedBy: 'player',
      requestedAt: new Date(),
    });
    await this.connectionRepository.save(connection);
    return this.toResponse(connection);
  }

  async respondToPlayerConnection(
    connectionId: string,
    userId: string,
    dto: RespondConnectionDto,
  ): Promise<PlayerConnectionResponseDto> {
    const connection = await this.playerConnectionRepository.findOne({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.addresseeId !== userId) {
      throw new ForbiddenException('You cannot respond to this connection');
    }

    if (connection.status !== 'pending') {
      throw new ConflictException('Connection has already been responded to');
    }

    connection.status = dto.status;
    connection.respondedAt = new Date();
    await this.playerConnectionRepository.save(connection);
    return this.toPlayerConnectionResponse(connection);
  }

  async respondToConnection(
    connectionId: string,
    userId: string,
    dto: RespondConnectionDto,
  ): Promise<ConnectionResponseDto> {
    const connection = await this.connectionRepository.findOne({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const canRespond =
      (connection.initiatedBy === 'player' && connection.scoutId === userId) ||
      (connection.initiatedBy === 'scout' && connection.playerId === userId);

    if (!canRespond) {
      throw new ForbiddenException('You cannot respond to this connection');
    }

    if (connection.status !== 'pending') {
      throw new ConflictException('Connection has already been responded to');
    }

    connection.status = dto.status;
    connection.respondedAt = new Date();
    await this.connectionRepository.save(connection);
    return this.toResponse(connection);
  }

  async listConnections(userId: string): Promise<{
    player_scout: ConnectionResponseDto[];
    player_player: PlayerConnectionResponseDto[];
  }> {
    const [playerScout, playerPlayer] = await Promise.all([
      this.connectionRepository.find({
        where: [{ playerId: userId }, { scoutId: userId }],
        order: { createdAt: 'DESC' },
      }),
      this.playerConnectionRepository.find({
        where: [{ requesterId: userId }, { addresseeId: userId }],
        order: { createdAt: 'DESC' },
      }),
    ]);
    return {
      player_scout: playerScout.map(c => this.toResponse(c)),
      player_player: playerPlayer.map(c => this.toPlayerConnectionResponse(c)),
    };
  }

  private toPlayerConnectionResponse(
    connection: PlayerConnection,
  ): PlayerConnectionResponseDto {
    return {
      id: connection.id,
      requester_id: connection.requesterId,
      addressee_id: connection.addresseeId,
      status: connection.status,
      requested_at: connection.requestedAt.toISOString(),
      responded_at: connection.respondedAt?.toISOString() ?? null,
      created_at: connection.createdAt.toISOString(),
      updated_at: connection.updatedAt.toISOString(),
    };
  }

  private toResponse(connection: Connection): ConnectionResponseDto {
    return {
      id: connection.id,
      player_id: connection.playerId,
      scout_id: connection.scoutId,
      status: connection.status,
      initiated_by: connection.initiatedBy,
      requested_at: connection.requestedAt.toISOString(),
      responded_at: connection.respondedAt?.toISOString() ?? null,
      created_at: connection.createdAt.toISOString(),
      updated_at: connection.updatedAt.toISOString(),
    };
  }
}
