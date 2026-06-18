import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import {
  BanUserDto,
  CreateAdminDto,
  QueryAnalyticsDto,
  QueryAuditLogDto,
  QueryGrowthDto,
  QueryReportsDto,
  ResolveReportDto,
  UpdateAdminDto,
  UlidParamDto,
  UserIdParamDto,
  VerifyPlayerDto,
  VerifyScoutDto,
} from './dto';
import { AdminGuard } from './guards';
import {
  AdminAnalyticsService,
  AdminAuditService,
  AdminManagementService,
  AdminModerationService,
  AdminVerificationService,
} from './services';

import { AnalyticsGranularity, AnalyticsPeriod } from '@/common/enums';

interface RequestWithAdmin extends ExpressRequest {
  user?: { sub: string; role: string };
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  private readonly moderationService: AdminModerationService;
  private readonly verificationService: AdminVerificationService;
  private readonly analyticsService: AdminAnalyticsService;
  private readonly auditService: AdminAuditService;
  private readonly managementService: AdminManagementService;

  constructor(
    moderationService: AdminModerationService,
    verificationService: AdminVerificationService,
    analyticsService: AdminAnalyticsService,
    auditService: AdminAuditService,
    managementService: AdminManagementService,
  ) {
    this.moderationService = moderationService;
    this.verificationService = verificationService;
    this.analyticsService = analyticsService;
    this.auditService = auditService;
    this.managementService = managementService;
  }

  /**
   * GET /api/admin/reports
   */
  @Get('reports')
  async getReports(@Query() query: QueryReportsDto) {
    return this.moderationService.getReports(query);
  }

  /**
   * PATCH /api/admin/report/:id/resolve
   */
  @Patch('report/:id/resolve')
  async resolveReport(
    @Param() params: UlidParamDto,
    @Body() dto: ResolveReportDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.moderationService.resolveReport(params.id, adminId, dto);
  }

  /**
   * POST /api/admin/ban/:user_id
   */
  @Post('ban/:user_id')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param() params: UserIdParamDto,
    @Body() dto: BanUserDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.moderationService.banUser(params.user_id, adminId, dto.reason);
  }

  /**
   * POST /api/admin/unban/:user_id
   */
  @Post('unban/:user_id')
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param() params: UserIdParamDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.moderationService.unbanUser(params.user_id, adminId);
  }

  /**
   * GET /api/admin/verifications
   */
  @Get('verifications')
  async getVerifications() {
    return this.verificationService.getPendingVerifications();
  }

  /**
   * PATCH /api/admin/verify/player/:id
   */
  @Patch('verify/player/:id')
  async verifyPlayer(
    @Param() params: UlidParamDto,
    @Body() dto: VerifyPlayerDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.verificationService.verifyPlayer(params.id, adminId, dto.notes);
  }

  /**
   * PATCH /api/admin/verify/scout/:id
   */
  @Patch('verify/scout/:id')
  async verifyScout(
    @Param() params: UlidParamDto,
    @Body() dto: VerifyScoutDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.verificationService.verifyScout(params.id, adminId, dto);
  }

  /**
   * GET /api/admin/analytics/overview
   */
  @Get('analytics/overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  /**
   * GET /api/admin/analytics/engagement
   */
  @Get('analytics/engagement')
  async getEngagement(@Query() query: QueryAnalyticsDto) {
    return this.analyticsService.getEngagement(
      query.period ?? AnalyticsPeriod.THIRTY_DAYS,
    );
  }

  /**
   * GET /api/admin/analytics/growth
   */
  @Get('analytics/growth')
  async getGrowth(@Query() query: QueryGrowthDto) {
    return this.analyticsService.getGrowth(
      query.period ?? AnalyticsPeriod.THIRTY_DAYS,
      query.granularity ?? AnalyticsGranularity.DAY,
    );
  }

  /**
   * GET /api/admin/audit-log
   */
  @Get('audit-log')
  async getAuditLog(@Query() query: QueryAuditLogDto) {
    return this.auditService.getAuditLog(query);
  }

  /**
   * GET /api/admin/admins
   */
  @Get('admins')
  async getAdmins() {
    return this.managementService.listAdmins();
  }

  /**
   * POST /api/admin/admins
   */
  @Post('admins')
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.managementService.createAdmin(adminId, dto);
  }

  /**
   * PATCH /api/admin/admins/:id
   */
  @Patch('admins/:id')
  async updateAdmin(
    @Param() params: UlidParamDto,
    @Body() dto: UpdateAdminDto,
    @Request() req: RequestWithAdmin,
  ) {
    const adminId = this.getAdminId(req);
    return this.managementService.updateAdmin(adminId, params.id, dto);
  }

  private getAdminId(req: RequestWithAdmin): string {
    // req.user is guaranteed to be set — JwtAuthGuard + AdminGuard both run before this.
    return req.user!.sub;
  }
}
