import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Filename', 'X-App-Version'],
    exposedHeaders: ['X-Filename', 'X-App-Version'],  // We need to expose this header so that Angular can access it.
  });
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
  await app.listen(3000);
}
bootstrap();
