import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';
  const isProd = nodeEnv === 'production';

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS configuration for Flutter Web
  app.enableCors({
    origin: isProd
      ? ['https://alanya.app', 'https://www.alanya.app']
      : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation (disabled in production)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Alanya API')
      .setDescription('API backend pour l\'application Alanya : messagerie temps réel, appels audio/vidéo, stories éphémères et assistant IA')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Auth', 'Authentification et inscription')
      .addTag('Users', 'Gestion des utilisateurs')
      .addTag('Countries', 'Référentiel pays')
      .addTag('Contacts', 'Gestion des contacts')
      .addTag('Conversations', 'Messagerie (conversations et messages)')
      .addTag('Calls', 'Appels audio/vidéo')
      .addTag('Meetings', 'Réunions planifiées')
      .addTag('Statuses', 'Stories/Statuts éphémères')
      .addTag('Media', 'Upload et téléchargement de médias')
      .addTag('Push', 'Notifications push (FCM)')
      .addTag('AI', 'Assistant IA (Gemini)')
      .addTag('Blocked', 'Utilisateurs bloqués')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
}

bootstrap();