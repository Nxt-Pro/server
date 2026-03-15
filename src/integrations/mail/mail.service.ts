import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.password');
    const secure = this.configService.get<boolean>('mail.secure', false);

    this.fromAddress =
      this.configService.get<string>('mail.from') ?? 'no-reply@nxtpro.app';

    if (!host || !port || !user || !pass) {
      this.logger.warn(
        'Mail configuration is incomplete. MailService will be disabled.',
      );
      this.transporter = null;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.transporter = (
      nodemailer as unknown as {
        createTransport: (options: unknown) => Transporter;
      }
    ).createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `MailService disabled. Would send mail to ${options.to} with subject "${options.subject}".`,
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const transporter = this.transporter as Transporter;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await transporter.sendMail({
      from: this.fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your NxtPro password';
    const text = `You requested a password reset for your NxtPro account.

If you did not request this, you can ignore this email.

Reset your password using the link below:
${resetUrl}

This link will expire in 1 hour.`;

    const html = `<p>You requested a password reset for your NxtPro account.</p>
<p>If you did not request this, you can ignore this email.</p>
<p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Reset your password</a></p>
<p>This link will expire in 1 hour.</p>`;

    await this.sendMail({ to: email, subject, text, html });
  }

  async sendTwoFactorCodeEmail(email: string, code: string): Promise<void> {
    const subject = 'Your NxtPro verification code';
    const text = `Your NxtPro verification code is: ${code}

This code will expire in 10 minutes. If you did not attempt to sign in, you can ignore this email.`;

    const html = `<p>Your NxtPro verification code is:</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
<p>This code will expire in 10 minutes. If you did not attempt to sign in, you can ignore this email.</p>`;

    await this.sendMail({ to: email, subject, text, html });
  }
}
