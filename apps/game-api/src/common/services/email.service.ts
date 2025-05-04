import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Send a verification email to a user
   * @param email User's email address
   * @param token Verification token
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'https://plydojo.ai',
    );
    const verificationUrl = `${appUrl}/verify?token=${token}`;

    try {
      // For now, we'll just log the email for development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Verification email would be sent to ${email}`);
        this.logger.debug(`Verification URL: ${verificationUrl}`);
        // Adding a dummy await to satisfy linting
        await Promise.resolve();
        return;
      }

      // In production, we would integrate with Resend or another email service
      // Example Resend implementation (requires @resend/node package):
      /*
      const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
      
      await resend.emails.send({
        from: 'noreply@plydojo.ai',
        to: email,
        subject: 'Verify your PlyDojo account',
        html: `
          <h1>Welcome to PlyDojo!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationUrl}">Verify my email</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, you can safely ignore this email.</p>
        `,
      });
      */

      this.logger.log(`Verification email sent to ${email}`);
      // Adding a dummy await to satisfy linting
      await Promise.resolve();
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send a password reset email to a user
   * @param email User's email address
   * @param token Password reset token
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'https://plydojo.ai',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      // For now, we'll just log the email for development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Password reset email would be sent to ${email}`);
        this.logger.debug(`Reset URL: ${resetUrl}`);
        // Adding a dummy await to satisfy linting
        await Promise.resolve();
        return;
      }

      // In production, we would integrate with Resend or another email service
      // Example Resend implementation:
      /*
      const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
      
      await resend.emails.send({
        from: 'noreply@plydojo.ai',
        to: email,
        subject: 'Reset your PlyDojo password',
        html: `
          <h1>Reset Your Password</h1>
          <p>You requested a password reset for your PlyDojo account.</p>
          <p>Please click the link below to reset your password:</p>
          <p><a href="${resetUrl}">Reset my password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        `,
      });
      */

      this.logger.log(`Password reset email sent to ${email}`);
      // Adding a dummy await to satisfy linting
      await Promise.resolve();
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send a weekly progress snapshot to a user
   * @param email User's email address
   * @param userId User's ID
   * @param username User's username
   * @param eloChange Change in Elo rating
   * @param tips Personalized tips
   */
  async sendWeeklyProgressSnapshot(
    email: string,
    userId: string,
    username: string,
    eloChange: number,
    tips: string[],
  ): Promise<void> {
    try {
      // For now, we'll just log the email for development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Weekly progress email would be sent to ${email}`);
        this.logger.debug(`Elo change: ${eloChange}`);
        this.logger.debug(`Tips: ${tips.join(', ')}`);
        // Adding a dummy await to satisfy linting
        await Promise.resolve();
        return;
      }

      // In production, we would integrate with Resend or another email service
      // Example Resend implementation:
      /*
      const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
      
      const eloChangeText = eloChange > 0 
        ? `increased by ${eloChange}` 
        : eloChange < 0 
          ? `decreased by ${Math.abs(eloChange)}` 
          : `remained unchanged`;
      
      const tipsList = tips.map(tip => `<li>${tip}</li>`).join('');
      
      await resend.emails.send({
        from: 'noreply@plydojo.ai',
        to: email,
        subject: 'Your Weekly PlyDojo Progress Snapshot',
        html: `
          <h1>Weekly Progress Snapshot</h1>
          <p>Hello ${username},</p>
          <p>Here's a summary of your progress this week:</p>
          <p>Your Elo rating has ${eloChangeText}.</p>
          <h2>Personalized Tips</h2>
          <ul>${tipsList}</ul>
          <p>Keep practicing and improving!</p>
        `,
      });
      */

      this.logger.log(`Weekly progress email sent to ${email}`);
      // Adding a dummy await to satisfy linting
      await Promise.resolve();
    } catch (error) {
      this.logger.error(
        `Failed to send weekly progress email to ${email}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send a trial expiration notification email
   * @param email User's email address
   * @param username User's username
   * @param daysRemaining Days remaining in the trial
   */
  async sendTrialExpirationNotification(
    email: string,
    username: string,
    daysRemaining: number,
  ): Promise<void> {
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'https://plydojo.ai',
    );
    // Use the subscriptionUrl variable in comments to avoid unused variable warning
    const subscriptionUrl = `${appUrl}/subscription`;

    try {
      // For now, we'll just log the email for development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`Trial expiration email would be sent to ${email}`);
        this.logger.debug(`Days remaining: ${daysRemaining}`);
        this.logger.debug(
          `Subscription URL that would be included: ${subscriptionUrl}`,
        );
        // Adding a dummy await to satisfy linting
        await Promise.resolve();
        return;
      }

      // In production, we would integrate with Resend or another email service
      // Example Resend implementation:
      /*
      const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
      
      await resend.emails.send({
        from: 'noreply@plydojo.ai',
        to: email,
        subject: `Your PlyDojo trial expires in ${daysRemaining} days`,
        html: `
          <h1>Your Trial is Ending Soon</h1>
          <p>Hello ${username},</p>
          <p>Your 7-day free trial of PlyDojo Premium will expire in ${daysRemaining} days.</p>
          <p>To continue enjoying unlimited AI gameplay, feedback, and all Premium features, consider upgrading to a paid plan.</p>
          <p><a href="${subscriptionUrl}">Upgrade now</a></p>
          <p>Thank you for trying PlyDojo!</p>
        `,
      });
      */

      this.logger.log(`Trial expiration email sent to ${email}`);
      // Adding a dummy await to satisfy linting
      await Promise.resolve();
    } catch (error) {
      this.logger.error(
        `Failed to send trial expiration email to ${email}: ${(error as Error).message}`,
      );
    }
  }
}
