import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  OAuthLoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  TwoFaConfirmDto,
  TwoFaEnableDto,
  TwoFaVerifyDto,
  TwoFaSetupResponseDto,
} from './dto';

import { CurrentUser, Public } from '@/common/decorators';
import type { JwtPayload } from '@/common/interfaces';

@Controller('auth')
export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('logout')
  async logout(
    @CurrentUser('sub') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    await this.authService.logout(userId, refreshToken);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Get('export')
  async exportAccountData(@CurrentUser('sub') userId: string) {
    return this.authService.exportAccountData(userId);
  }

  @Patch('password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password updated' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'Reset link has been sent to your email' };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  @Patch('2fa')
  async updateTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() dto: TwoFaEnableDto,
  ) {
    await this.authService.setTwoFactorEnabled(userId, dto.enabled);
    return {
      message: `Two-factor authentication ${dto.enabled ? 'enabled' : 'disabled'}`,
    };
  }

  @Patch('2fa/setup')
  async startTwoFactorSetup(
    @CurrentUser('sub') userId: string,
  ): Promise<TwoFaSetupResponseDto> {
    return this.authService.startTwoFactorSetup(userId);
  }

  @Patch('2fa/confirm')
  async confirmTwoFactorSetup(
    @CurrentUser('sub') userId: string,
    @Body() dto: TwoFaConfirmDto,
  ) {
    await this.authService.confirmTwoFactorSetup(userId, dto.code);
    return { message: 'Two-factor authentication has been enabled' };
  }

  @Public()
  @Post('2fa/verify')
  async verifyTwoFactor(@Body() dto: TwoFaVerifyDto) {
    return this.authService.verifyTwoFactor(dto.twoFactorToken, dto.code);
  }

  @Public()
  @Post('oauth')
  async oauthLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin(dto);
  }
}
