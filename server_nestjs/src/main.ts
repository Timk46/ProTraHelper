import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Filename'],
    exposedHeaders: ['X-Filename'],  // We need to expose this header so that Angular can access it.
  });
  await app.listen(3000);
}
bootstrap();
