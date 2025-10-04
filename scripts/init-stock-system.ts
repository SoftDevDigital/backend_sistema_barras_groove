import { DynamoDBService } from '../src/shared/services/dynamodb.service';
import { ProductService } from '../src/products/services/product.service';
import { TABLE_NAMES } from '../src/shared/config/dynamodb.config';
import * as dotenv from 'dotenv';

dotenv.config();

const dynamoDBService = new DynamoDBService();

async function initializeStockSystem() {
  console.log('📦 Inicializando sistema de stock...');
  
  try {
    // Verificar que las tablas de stock existen
    const stockTables = [
      TABLE_NAMES.STOCK_MOVEMENTS,
      TABLE_NAMES.BAR_STOCK,
      TABLE_NAMES.GLOBAL_STOCK,
      TABLE_NAMES.STOCK_ALERTS,
      TABLE_NAMES.STOCK_TRANSFERS,
    ];

    console.log('🔍 Verificando tablas de stock...');
    for (const tableName of stockTables) {
      try {
        await dynamoDBService.scan(tableName, undefined, undefined, { Limit: 1 });
        console.log(`✅ Tabla ${tableName} existe`);
      } catch (error) {
        console.log(`❌ Tabla ${tableName} no existe`);
        console.log('💡 Ejecuta primero: npm run create-tables');
        return;
      }
    }

    // Verificar si hay productos para inicializar stock global
    console.log('🔍 Verificando productos existentes...');
    const products = await dynamoDBService.scan(TABLE_NAMES.PRODUCTS);
    
    if (products.length === 0) {
      console.log('⚠️  No hay productos para inicializar stock');
      console.log('💡 Crea algunos productos primero');
      return;
    }

    console.log(`📊 Encontrados ${products.length} productos`);

    // Inicializar stock global para cada producto
    console.log('🏭 Inicializando stock global...');
    for (const product of products) {
      try {
        // Verificar si ya existe stock global para este producto
        const existingStock = await dynamoDBService.query(
          TABLE_NAMES.GLOBAL_STOCK,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `PRODUCT#${product.id}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );

        if (existingStock && existingStock.length > 0) {
          console.log(`   ✅ Stock global ya existe para ${product.name}`);
          continue;
        }

        // Crear stock global inicial
        const globalStockItem = {
          PK: `GLOBAL_STOCK#${product.id}`,
          SK: `GLOBAL_STOCK#${product.id}`,
          GSI1PK: `PRODUCT#${product.id}`,
          GSI1SK: `GLOBAL_STOCK#${new Date().toISOString()}`,
          id: product.id,
          productId: product.id,
          productName: product.name,
          totalStock: product.stock || 0,
          reservedStock: 0,
          availableStock: product.stock || 0,
          minStock: product.minStock || 0,
          maxStock: product.maxStock,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await dynamoDBService.put(TABLE_NAMES.GLOBAL_STOCK, globalStockItem);
        console.log(`   ✅ Stock global creado para ${product.name} (${product.stock || 0} unidades)`);
      } catch (error) {
        console.error(`   ❌ Error creando stock global para ${product.name}:`, error.message);
      }
    }

    console.log('✅ Sistema de stock inicializado exitosamente');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Asignar stock inicial a las barras para eventos activos');
    console.log('   2. Configurar alertas de stock bajo si es necesario');
    console.log('   3. Probar el sistema con ventas de prueba');
    console.log('');
    console.log('🔗 Endpoints disponibles:');
    console.log('   POST /stock/assign - Asignar stock a barra');
    console.log('   GET /stock/search - Buscar stock');
    console.log('   GET /stock/alerts - Ver alertas');
    console.log('   POST /stock/move - Crear movimiento');
    console.log('   GET /stock/stats - Estadísticas');

  } catch (error) {
    console.error('❌ Error inicializando sistema de stock:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initializeStockSystem()
    .then(() => {
      console.log('🏁 Inicialización completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { initializeStockSystem };
