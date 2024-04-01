import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true});
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Filename'],
    exposedHeaders: ['X-Filename'],  // We need to expose this header so that Angular can access it.
  });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  await app.listen(3000);
}
bootstrap();
