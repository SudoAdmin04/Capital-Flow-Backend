import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // Render terminates TLS at its proxy; trust the first proxy hop so rate
  // limiting and logs see the real client IP instead of the proxy address.
  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  app.use(helmet({ contentSecurityPolicy: isProd }));
  const fallbackOrigins =
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001';
  const origins = (process.env.CORS_ORIGINS ?? fallbackOrigins)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: isProd ? origins : true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Respuesta unificada { message, ...datos } vía @ResponseMessage()
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = parseInt(process.env.PORT ?? '4002', 10);

  if (!isProd) {
    const doc = new DocumentBuilder()
      .setTitle('Finanzas Personales API')
      .setVersion('0.1.0')
      .setContact('Capital Flow', 'http://localhost:5002', 'soporte@capitalflow.local')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, doc);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Capital Flow API — Docs',
      swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'alpha' },
    });
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`API lista en http://localhost:${port}/api${isProd ? '' : ' (docs en /api/docs)'}`, 'Bootstrap');
  Logger.log(`CORS origins: ${isProd ? origins.join(', ') : '(dev: se refleja cualquier origen)'}`, 'Bootstrap');
}
bootstrap();
