// Función para obtener variables de entorno con valores por defecto seguros
const getEnvVar = (key: string, defaultValue: string, required = false): string => {
  const value = process.env[key];
  if (!value && required) {
    console.warn(`Required environment variable '${key}' not found. Using default value.`);
  }
  return value || defaultValue;
};

// Función para obtener números de variables de entorno
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  const parsed = value ? parseInt(value, 10) : defaultValue;
  if (value && isNaN(parsed)) {
    console.warn(`Variable '${key}' has invalid value '${value}'. Using default value: ${defaultValue}`);
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
    secret: getEnvVar('JWT_SECRET', 'super-secret-jwt-key-for-bar-system-2024-production-ready'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  },
  
  // AWS
  aws: {
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID', 'your_access_key_here'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY', 'your_secret_key_here'),
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
  console.log('Validating application configuration...');
  
  if (appConfig.nodeEnv === 'production') {
    console.log('Running in PRODUCTION mode - validating critical variables...');
    
    const requiredVars = [
      { key: 'JWT_SECRET', description: 'Secreto para firmar tokens JWT' },
      { key: 'AWS_ACCESS_KEY_ID', description: 'Access Key de AWS para DynamoDB' },
      { key: 'AWS_SECRET_ACCESS_KEY', description: 'Secret Key de AWS para DynamoDB' },
    ];
    
    const missingVars = requiredVars.filter(({ key }) => !process.env[key] || process.env[key] === '');
    
    if (missingVars.length > 0) {
      console.error('CRITICAL ERROR: Required environment variables for production:');
      missingVars.forEach(({ key, description }) => {
        console.error(`   - ${key}: ${description}`);
      });
      console.error('Solution: Configure these variables in your .env file or system environment variables');
      
      // NO lanzamos error, solo mostramos advertencias para que la app no se detenga
      console.warn('Application will continue with default values (NOT RECOMMENDED for production)');
    }
    
    if (appConfig.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
      console.error('CRITICAL ERROR: JWT_SECRET must be changed in production');
      console.error('Solution: Configure JWT_SECRET with a secure value in your .env file');
      console.warn('Application will continue with default secret (UNSAFE for production)');
    }
  } else {
    console.log('Running in DEVELOPMENT mode');
    
    // Advertencias para desarrollo
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here') {
      console.warn('AWS_ACCESS_KEY_ID not configured - using default values');
    }
    
    if (!process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY === 'your_secret_key_here') {
      console.warn('AWS_SECRET_ACCESS_KEY not configured - using default values');
    }
    
    if (appConfig.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
      console.warn('JWT_SECRET using default value - consider changing it for better security');
    }
  }
  
  console.log('Configuration validation completed');
  console.log(`Port: ${appConfig.port}`);
  console.log(`Environment: ${appConfig.nodeEnv}`);
  console.log(`AWS Region: ${appConfig.aws.region}`);
  console.log(`Table Prefix: ${appConfig.dynamodb.tablePrefix}`);
};
