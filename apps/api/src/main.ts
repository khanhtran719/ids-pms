import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Server } from 'node:http';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { EnvironmentVariables } from './app/core/config/environment';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const globalPrefix = 'api';
  const configuredOrigins: string = config.getOrThrow('WEB_ORIGIN');
  const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim());
  const trustProxyHops = config.getOrThrow('TRUST_PROXY_HOPS');
  const express = app.getHttpAdapter().getInstance();

  express.disable('x-powered-by');
  if (trustProxyHops > 0) {
    express.set('trust proxy', trustProxyHops);
  }
  app.setGlobalPrefix(globalPrefix);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useBodyParser('json', {
    limit: config.getOrThrow('JSON_BODY_LIMIT'),
  });
  app.useBodyParser('urlencoded', {
    extended: false,
    limit: config.getOrThrow('JSON_BODY_LIMIT'),
    parameterLimit: config.getOrThrow('URLENCODED_PARAMETER_LIMIT'),
  });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    }),
  );
  app.enableShutdownHooks();

  if (config.getOrThrow('ENABLE_SWAGGER')) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('IDS PMS API')
      .setDescription('API for the IDS project management system')
      .setVersion('1.0')
      .build();
    const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, openApiDocument);
  }

  const port = config.getOrThrow('API_PORT');
  await app.listen(port);
  const server = app.getHttpServer() as Server;
  server.requestTimeout = 30_000;
  server.headersTimeout = 31_000;
  server.keepAliveTimeout = 5_000;
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

void bootstrap();
