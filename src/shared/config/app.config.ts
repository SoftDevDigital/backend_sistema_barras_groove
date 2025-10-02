// Función para obtener variables de entorno con valores por defecto seguros
const getEnvVar = (key: string, defaultValue: string, required = false): string => {
  const value = process.env[key];
  if (!value && required) {
    console.warn(`⚠️  Variable de entorno requerida '${key}' no encontrada. Usando valor por defecto.`);
  }
  return value || defaultValue;
};

// Función para obtener números de variables de entorno
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  const parsed = value ? parseInt(value, 10) : defaultValue;
  if (value && isNaN(parsed)) {
    console.warn(`⚠️  Variable '${key}' tiene valor inválido '${value}'. Usando valor por defecto: ${defaultValue}`);
  }
  return parsed;
};

export const appConfig = {
  // Application
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3001),
  corsOrigin: getEnvVar('CORS_ORIGIN', '*'),
  
  // JWT
  jwt: {
    secret: getEnvVar('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  },
  
  // AWS
  aws: {
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY', ''),
  },
  
  // DynamoDB
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    tablePrefix: getEnvVar('DYNAMODB_TABLE_PREFIX', 'bar_system'),
  },
  
  // Printer
  printer: {
    defaultName: getEnvVar('DEFAULT_PRINTER_NAME', 'Epson_TM-T20'),
    timeout: getEnvNumber('PRINTER_TIMEOUT', 5000),
  },
  
  // File Upload
  upload: {
    maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10485760), // 10MB
    uploadPath: getEnvVar('UPLOAD_PATH', './uploads'),
  },
} as const;

// Validar configuración crítica en producción
export const validateConfig = () => {
  console.log('🔧 Validando configuración de la aplicación...');
  
  if (appConfig.nodeEnv === 'production') {
    console.log('🏭 Ejecutándose en modo PRODUCCIÓN - validando variables críticas...');
    
    const requiredVars = [
      { key: 'JWT_SECRET', description: 'Secreto para firmar tokens JWT' },
      { key: 'AWS_ACCESS_KEY_ID', description: 'Access Key de AWS para DynamoDB' },
      { key: 'AWS_SECRET_ACCESS_KEY', description: 'Secret Key de AWS para DynamoDB' },
    ];
    
    const missingVars = requiredVars.filter(({ key }) => !process.env[key] || process.env[key] === '');
    
    if (missingVars.length > 0) {
      console.error('❌ ERROR CRÍTICO: Variables de entorno requeridas para producción:');
      missingVars.forEach(({ key, description }) => {
        console.error(`   - ${key}: ${description}`);
      });
      console.error('💡 Solución: Configura estas variables en tu archivo .env o variables de entorno del sistema');
      
      // NO lanzamos error, solo mostramos advertencias para que la app no se detenga
      console.warn('⚠️  La aplicación continuará con valores por defecto (NO RECOMENDADO para producción)');
    }
    
    if (appConfig.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
      console.error('❌ ERROR CRÍTICO: JWT_SECRET debe ser cambiado en producción');
      console.error('💡 Solución: Configura JWT_SECRET con un valor seguro en tu archivo .env');
      console.warn('⚠️  La aplicación continuará con el secreto por defecto (INSEGURO para producción)');
    }
  } else {
    console.log('🔧 Ejecutándose en modo DESARROLLO');
    
    // Advertencias para desarrollo
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here') {
      console.warn('⚠️  AWS_ACCESS_KEY_ID no configurado - usando valores por defecto');
    }
    
    if (!process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY === 'your_secret_key_here') {
      console.warn('⚠️  AWS_SECRET_ACCESS_KEY no configurado - usando valores por defecto');
    }
    
    if (appConfig.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
      console.warn('⚠️  JWT_SECRET usando valor por defecto - considera cambiarlo para mayor seguridad');
    }
  }
  
  console.log('✅ Validación de configuración completada');
  console.log(`📊 Puerto: ${appConfig.port}`);
  console.log(`🌍 Entorno: ${appConfig.nodeEnv}`);
  console.log(`🗄️  Región AWS: ${appConfig.aws.region}`);
  console.log(`📋 Prefijo tablas: ${appConfig.dynamodb.tablePrefix}`);
};
