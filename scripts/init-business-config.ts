import { DynamoDBService } from '../src/shared/services/dynamodb.service';
import { BusinessConfigModel } from '../src/shared/models/business-config.model';
import { TABLE_NAMES } from '../src/shared/config/dynamodb.config';
import * as dotenv from 'dotenv';

dotenv.config();

const dynamoDBService = new DynamoDBService();

async function initializeBusinessConfig() {
  console.log('🏢 Inicializando configuración del negocio...');
  
  try {
    // Verificar si ya existe una configuración
    const existingConfigs = await dynamoDBService.query(
      TABLE_NAMES.BUSINESS_CONFIG,
      'GSI1PK = :gsi1pk',
      { ':gsi1pk': 'BUSINESS_CONFIG#ACTIVE' }
    );

    if (existingConfigs && existingConfigs.length > 0) {
      console.log('✅ Configuración del negocio ya existe');
      console.log(`   - Nombre: ${existingConfigs[0].businessName}`);
      console.log(`   - Dirección: ${existingConfigs[0].businessAddress}`);
      console.log(`   - Teléfono: ${existingConfigs[0].businessPhone}`);
      return;
    }

    // Crear configuración por defecto
    const defaultConfig = new BusinessConfigModel({
      businessName: 'Despedida de año G&G',
      businessAddress: 'Av. Principal 123, Ciudad',
      businessPhone: '+1 (555) 123-4567',
      businessEmail: 'info@groovebar.com',
      businessTaxId: 'RUC: 12345678901',
      businessWebsite: 'fest-go.com',
      businessLogo: '',
      currency: 'ARS',
      taxRate: 10,
      thankYouMessage: '¡Gracias por su compra!',
      receiptFooter: 'Sistema de Barras Fest-Go',
      printerSettings: {
        paperWidth: 80,
        fontSize: 12,
        fontFamily: 'monospace'
      }
    });

    await dynamoDBService.put(TABLE_NAMES.BUSINESS_CONFIG, defaultConfig.toDynamoDBItem());

    console.log('✅ Configuración del negocio creada exitosamente');
    console.log(`   - ID: ${defaultConfig.id}`);
    console.log(`   - Nombre: ${defaultConfig.businessName}`);
    console.log(`   - Dirección: ${defaultConfig.businessAddress}`);
    console.log(`   - Teléfono: ${defaultConfig.businessPhone}`);
    console.log(`   - Email: ${defaultConfig.businessEmail}`);
    console.log(`   - Moneda: ${defaultConfig.currency}`);
    console.log(`   - Impuesto: ${defaultConfig.taxRate}%`);
    console.log(`   - Mensaje: ${defaultConfig.thankYouMessage}`);
    
  } catch (error: any) {
    console.error('❌ Error inicializando configuración del negocio:', error);
    console.error('   Detalles:', error.message);
  }
}

if (require.main === module) {
  initializeBusinessConfig().catch(console.error);
}

export { initializeBusinessConfig };
