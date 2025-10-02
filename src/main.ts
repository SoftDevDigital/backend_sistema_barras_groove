import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig, validateConfig } from './shared/config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import * as dotenv from 'dotenv';
import { Server } from 'net';

// Cargar variables de entorno
dotenv.config();

// Función para verificar si un puerto está disponible
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = new Server();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
};

// Función para encontrar un puerto disponible
const findAvailablePort = async (startPort: number, maxAttempts = 10): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    
    if (available) {
      return port;
    }
    
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
};

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
  
  try {
    // Intentar usar el puerto configurado primero
    const isDefaultPortAvailable = await isPortAvailable(appConfig.port);
    
    if (isDefaultPortAvailable) {
      await app.listen(appConfig.port);
      console.log(`Application is running on: http://localhost:${appConfig.port}`);
    } else {
      console.log(`Port ${appConfig.port} is in use, searching for alternative port...`);
      const availablePort = await findAvailablePort(appConfig.port);
      await app.listen(availablePort);
      console.log(`Application is running on: http://localhost:${availablePort}`);
      console.log(`Original port ${appConfig.port} was occupied, using port ${availablePort}`);
    }
  } catch (error) {
    console.error('Error starting application:', error.message);
    process.exit(1);
  }
  
  console.log(`Environment: ${appConfig.nodeEnv}`);
  console.log(`CORS Origin: ${appConfig.corsOrigin}`);
  console.log(`DynamoDB Region: ${appConfig.aws.region}`);
}
bootstrap();
