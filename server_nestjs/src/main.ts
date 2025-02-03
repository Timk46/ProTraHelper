import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Filename', 'X-App-Version', 'Device-Id'],
    exposedHeaders: ['X-Filename', 'X-App-Version'],  // We need to expose this header so that Angular can access it.
  });
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));


    //console.log = () => {}; // disable console.log in production - use nest.js logger instead, if important logs are needed
    //console.debug = () => {};
    //console.info = () => {};
    //console.warn = () => {};
    //console.error = () => {};


  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
