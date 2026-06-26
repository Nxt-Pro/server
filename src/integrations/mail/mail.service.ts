import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type MailTransporter = {
  sendMail: (message: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) => Promise<unknown>;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter: MailTransporter | null;
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

    const nodemailerSafe = nodemailer as unknown as {
      createTransport: (options: {
        host: string;
        port: number;
        secure: boolean;
        auth: { user: string; pass: string };
      }) => MailTransporter;
    };

    this.transporter = nodemailerSafe.createTransport({
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
      this.logger.error(
        `MailService disabled. Cannot send mail to ${options.to} with subject "${options.subject}".`,
      );
      throw new ServiceUnavailableException(
        'Email service is not configured. Please contact support.',
      );
    }

    const transporter = this.transporter;

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

  async sendChatRequestEmail(
    email: string,
    requesterName: string,
    messagePreview?: string,
  ): Promise<void> {
    const subject = 'New chat request on NxtPro';
    const preview = messagePreview
      ? `\n\nMessage preview:\n"${messagePreview}"`
      : '';
    const text = `${requesterName} requested to chat with you on NxtPro.${preview}

Open NxtPro to review and respond to the request.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendChatAcceptedEmail(email: string, scoutName: string): Promise<void> {
    const subject = 'Your NxtPro chat request was accepted';
    const text = `${scoutName} accepted your chat request on NxtPro.

Open NxtPro to continue the conversation.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendChatRejectedEmail(email: string, scoutName: string): Promise<void> {
    const subject = 'Your NxtPro chat request was declined';
    const text = `${scoutName} declined your chat request on NxtPro.

You can continue discovering other scouts and opportunities in NxtPro.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendConnectionRequestEmail(
    email: string,
    requesterName: string,
  ): Promise<void> {
    const subject = 'New connection request on NxtPro';
    const text = `${requesterName} sent you a connection request on NxtPro.

Open NxtPro to review and respond.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendConnectionAcceptedEmail(
    email: string,
    accepterName: string,
  ): Promise<void> {
    const subject = 'Your NxtPro connection request was accepted';
    const text = `${accepterName} accepted your connection request on NxtPro.

Open NxtPro to view their profile.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendEventRegistrationSubmittedEmail(
    email: string,
    eventTitle: string,
  ): Promise<void> {
    const subject = 'Your NxtPro event registration was submitted';
    const text = `Your registration for "${eventTitle}" was submitted.

Open NxtPro to follow its status.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendEventRegistrationStatusEmail(
    email: string,
    eventTitle: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    const subject =
      status === 'approved'
        ? 'Your NxtPro event registration was accepted'
        : 'Your NxtPro event registration was rejected';
    const text = `Your registration for "${eventTitle}" was ${status}.

Open NxtPro to view the event details.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendEventCancelledEmail(
    email: string,
    eventTitle: string,
  ): Promise<void> {
    const subject = 'A NxtPro event was cancelled';
    const text = `"${eventTitle}" was cancelled.

Open NxtPro to find other events.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendEventStatusEmail(
    email: string,
    eventTitle: string,
    status: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const subject =
      status === 'approved'
        ? 'Your NxtPro event was approved'
        : 'Your NxtPro event was rejected';
    const reasonText = reason ? `\n\nReason:\n${reason}` : '';
    const text = `"${eventTitle}" was ${status}.${reasonText}

Open NxtPro to review the event.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendVerificationStatusEmail(
    email: string,
    status: 'verified' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const subject =
      status === 'verified'
        ? 'Your NxtPro profile was verified'
        : 'Your NxtPro verification was rejected';
    const reasonText = reason ? `\n\nReason:\n${reason}` : '';
    const text =
      status === 'verified'
        ? `Your NxtPro profile verification was approved.

Open NxtPro to view your verified profile.`
        : `Your NxtPro verification was rejected.${reasonText}

Open NxtPro to review your profile.`;

    await this.sendMail({ to: email, subject, text });
  }

  async sendAccountStatusEmail(
    email: string,
    status: string,
    reason?: string,
  ): Promise<void> {
    const subject = 'Your NxtPro account status changed';
    const reasonText = reason ? `\n\nReason:\n${reason}` : '';
    const text = `Your NxtPro account status is now "${status}".${reasonText}

Contact support if you believe this was a mistake.`;

    await this.sendMail({ to: email, subject, text });
  }
}
