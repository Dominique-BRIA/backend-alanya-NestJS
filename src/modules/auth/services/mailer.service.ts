import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as firebaseAdmin from 'firebase-admin';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private firebaseApp: firebaseAdmin.app.App | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
    this.initFirebase();
  }

  private initTransporter() {
    const provider = this.configService.get<string>('app.mail.provider');

    if (provider === 'smtp') {
      const host = this.configService.get<string>('app.mail.host');
      const port = this.configService.get<number>('app.mail.port');
      const user = this.configService.get<string>('app.mail.user');
      const pass = this.configService.get<string>('app.mail.pass');

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log('SMTP transporter initialized');
      }
    }
  }

  private initFirebase() {
    const serviceAccountBase64 = this.configService.get<string>(
      'app.firebase.serviceAccountBase64',
    );

    if (serviceAccountBase64) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'),
        );
        this.firebaseApp = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin initialized for email');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin', error);
      }
    }
  }

  async sendOtpEmail(email: string, type: 'verification' | 'reset_password') {
    const provider = this.configService.get<string>('app.mail.provider');
    const from = this.configService.get<string>('app.mail.from') || 'Alanya <no-reply@alanya.app>';

    const subject =
      type === 'verification'
        ? 'Vérification de votre email Alanya'
        : 'Réinitialisation de votre mot de passe Alanya';

    const otpCode = await this.getLatestOtp(email, type);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Alanya</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
            <h2 style="color: #333; margin-top: 0;">${type === 'verification' ? 'Vérifiez votre email' : 'Réinitialisez votre mot de passe'}</h2>
            <p>Bonjour,</p>
            <p>${type === 'verification' ? 'Merci de vous être inscrit sur Alanya.' : 'Vous avez demandé la réinitialisation de votre mot de passe.'}</p>
            <p>Votre code de vérification à 6 chiffres :</p>
            <div style="background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes. Ne le partagez avec personne.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 Alanya. Tous droits réservés.</p>
          </div>
        </body>
      </html>
    `;

    if (provider === 'firebase' && this.firebaseApp) {
      await this.sendViaFirebase(email, subject, html);
    } else if (this.transporter) {
      await this.sendViaSmtp(email, subject, html, from);
    } else {
      // Console fallback for development
      this.logger.log(`[EMAIL] To: ${email}, Subject: ${subject}, OTP: ${otpCode}`);
    }
  }

  private async getLatestOtp(email: string, type: string): Promise<string> {
    // This would typically come from the OTP service
    // For now, we'll generate a placeholder - actual OTP is handled by OtpService
    return '******';
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string,
    from: string,
  ) {
    await this.transporter!.sendMail({
      from,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent via SMTP to ${to}`);
  }

  private async sendViaFirebase(to: string, subject: string, html: string) {
    const collection = this.configService.get<string>('app.firebase.mailCollection') || 'mail';
    const firestore = this.firebaseApp!.firestore();

    await firestore.collection(collection).add({
      to,
      subject,
      html,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
    this.logger.log(`Email queued via Firebase to ${to}`);
  }
}