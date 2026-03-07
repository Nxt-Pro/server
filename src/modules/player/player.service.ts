import { Injectable, Logger } from '@nestjs/common';

import { PlayerProfile } from '@/database/entities';
import { PlayerProfileRepository } from '@/database/repositories';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  private readonly playerProfileRepository: PlayerProfileRepository;

  constructor(playerProfileRepository: PlayerProfileRepository) {
    this.playerProfileRepository = playerProfileRepository;
  }

  /**
   * Returns featured players.
   * A player is featured if `isFeatured = true` AND `featuredUntil` is either
   * null (permanently featured) or still in the future.
   *
   * Falls back to top players by AI score if no explicitly-featured players exist.
   *
   * GET (/api/player/featured)
   */
  async getFeaturedPlayers(limit = 20): Promise<PlayerProfile[]> {
    const now = new Date();

    // First, try explicitly-featured players
    const featured = await this.playerProfileRepository.find({
      where: { isFeatured: true },
      order: { aiScore: 'DESC' },
      take: limit,
    });

    // Filter out expired features
    const activeFeatured = featured.filter(
      p => !p.featuredUntil || new Date(p.featuredUntil) >= now,
    );

    if (activeFeatured.length > 0) {
      return activeFeatured;
    }

    // Fallback: top players by AI score (verified preferred)
    this.logger.debug(
      'Not enough featured players. Falling back to top AI scores',
    );

    return this.playerProfileRepository.find({
      where: { isVerified: true },
      order: { aiScore: 'DESC' },
      take: limit,
    });
  }
}
