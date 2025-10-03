import { DynamoDBClient, DeleteTableCommand, CreateTableCommand, DescribeTableCommand, ScalarAttributeType, KeyType, ProjectionType, BillingMode } from '@aws-sdk/client-dynamodb';
import { TABLE_NAMES } from '../src/shared/config/dynamodb.config';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
});

async function deleteTable(tableName: string) {
  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`🗑️  Tabla ${tableName} eliminada`);
    
    // Esperar a que la tabla se elimine completamente
    let tableExists = true;
    while (tableExists) {
      try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          tableExists = false;
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      console.error(`❌ Error eliminando tabla ${tableName}:`, error.message);
    }
  }
}

async function createProductsTable() {
  const tableConfig = {
    TableName: TABLE_NAMES.PRODUCTS,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' as KeyType },
      { AttributeName: 'SK', KeyType: 'RANGE' as KeyType },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' as ScalarAttributeType },
      { AttributeName: 'SK', AttributeType: 'S' as ScalarAttributeType },
      { AttributeName: 'GSI1PK', AttributeType: 'S' as ScalarAttributeType },
      { AttributeName: 'GSI1SK', AttributeType: 'S' as ScalarAttributeType },
      { AttributeName: 'GSI2PK', AttributeType: 'S' as ScalarAttributeType },
      { AttributeName: 'GSI2SK', AttributeType: 'S' as ScalarAttributeType },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' as KeyType },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' as KeyType },
        ],
        Projection: { ProjectionType: 'ALL' as ProjectionType },
      },
      {
        IndexName: 'GSI2',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' as KeyType },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' as KeyType },
        ],
        Projection: { ProjectionType: 'ALL' as ProjectionType },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST' as BillingMode,
  };

  try {
    await client.send(new CreateTableCommand(tableConfig));
    console.log(`✅ Tabla ${TABLE_NAMES.PRODUCTS} recreada exitosamente con índices GSI`);
  } catch (error: any) {
    console.error(`❌ Error creando tabla ${TABLE_NAMES.PRODUCTS}:`, error.message);
  }
}

async function recreateProductsTable() {
  console.log('🔄 Recreando tabla de productos con índices GSI...');
  
  await deleteTable(TABLE_NAMES.PRODUCTS);
  await createProductsTable();
  
  console.log('✨ Proceso completado');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  recreateProductsTable().catch(console.error);
}

export { recreateProductsTable };
