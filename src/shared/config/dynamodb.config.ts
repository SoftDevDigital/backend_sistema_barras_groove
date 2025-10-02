import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Configuración de DynamoDB para AWS real
const getDynamoDBConfig = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  // Mostrar información de configuración
  console.log('🗄️  Configurando DynamoDB...');
  console.log(`   - Región: ${region}`);
  console.log(`   - Endpoint: ${endpoint || 'AWS Cloud'}`);
  console.log(`   - Access Key configurado: ${accessKeyId ? '✅ Sí' : '❌ No'}`);
  console.log(`   - Secret Key configurado: ${secretAccessKey ? '✅ Sí' : '❌ No'}`);

  const config: any = {
    region,
  };

  // Solo agregar credenciales si están configuradas
  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
    console.log('✅ Usando credenciales AWS configuradas');
  } else {
    console.warn('⚠️  Credenciales AWS no configuradas - intentando usar credenciales por defecto del sistema');
    // En desarrollo, puede usar credenciales del AWS CLI o IAM roles
  }

  // Solo agregar endpoint si está configurado (para desarrollo local)
  if (endpoint) {
    config.endpoint = endpoint;
    console.log('🔧 Usando DynamoDB Local');
  }

  return config;
};

const dynamoDBConfig = getDynamoDBConfig();

export const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);
export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Nombres de tablas con prefijo configurable
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'bar_system';

export const TABLE_NAMES = {
  EVENTS: `${tablePrefix}_events`,
  BARS: `${tablePrefix}_bars`,
  PRODUCTS: `${tablePrefix}_products`,
  EMPLOYEES: `${tablePrefix}_employees`,
  EMPLOYEE_ASSIGNMENTS: `${tablePrefix}_employee_assignments`,
  TICKETS: `${tablePrefix}_tickets`,
  EXPENSES: `${tablePrefix}_expenses`,
  STOCK: `${tablePrefix}_stock`,
  USERS: `${tablePrefix}_users`,
} as const;

// Configuración de índices GSI
export const GSI_CONFIG = {
  GSI1: 'GSI1',
  GSI2: 'GSI2',
} as const;
