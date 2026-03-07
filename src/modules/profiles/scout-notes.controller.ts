import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateScoutNoteDto, UpdateScoutNoteDto } from './dto';
import { ProfilesService } from './profiles.service';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('scout/notes')
export class ScoutNotesController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Post()
  createNote(@CurrentUser() user: JwtPayload, @Body() dto: CreateScoutNoteDto) {
    return this.profilesService.createScoutNote(user.sub, dto);
  }

  @Get()
  listNotes(
    @CurrentUser() user: JwtPayload,
    @Query('playerId') playerId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.profilesService.getScoutNotes(user.sub, playerId, page, limit);
  }

  @Get(':id')
  getNote(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.profilesService.getScoutNote(id, user.sub);
  }

  @Patch(':id')
  updateNote(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateScoutNoteDto,
  ) {
    return this.profilesService.updateScoutNote(id, user.sub, dto);
  }

  @Delete(':id')
  async deleteNote(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.profilesService.deleteScoutNote(id, user.sub);
  }
}
