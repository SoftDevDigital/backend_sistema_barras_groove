import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig, validateConfig } from './shared/config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function bootstrap() {
  // Validar configuración
  validateConfig();
  
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS
  app.enableCors({
    origin: appConfig.corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Configurar filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Configurar prefijo global para la API
  app.setGlobalPrefix('api/v1');
  
  await app.listen(appConfig.port);
  
  console.log(`🚀 Application is running on: http://localhost:${appConfig.port}/api/v1`);
  console.log(`📊 Environment: ${appConfig.nodeEnv}`);
  console.log(`🔧 CORS Origin: ${appConfig.corsOrigin}`);
  console.log(`🗄️ DynamoDB Region: ${appConfig.aws.region}`);
}
bootstrap();
