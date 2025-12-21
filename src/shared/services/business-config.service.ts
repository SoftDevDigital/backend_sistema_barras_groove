import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';
import { BusinessConfigModel } from '../models/business-config.model';
import { IBusinessConfig, IBusinessConfigCreate, IBusinessConfigUpdate } from '../interfaces/business-config.interface';
import { TABLE_NAMES } from '../config/dynamodb.config';

@Injectable()
export class BusinessConfigService {
  private readonly logger = new Logger(BusinessConfigService.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async getActiveConfig(): Promise<IBusinessConfig> {
    const startTime = Date.now();
    this.logger.log('Getting active business configuration', 'BusinessConfigService.getActiveConfig');

    try {
      // Buscar configuración activa
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.BUSINESS_CONFIG,
        'GSI1PK = :gsi1pk',
        { ':gsi1pk': 'BUSINESS_CONFIG#ACTIVE' }
      );

      if (items.length === 0) {
        this.logger.warn('No business configuration found, creating default', 'BusinessConfigService.getActiveConfig');
        return this.createDefaultConfig();
      }

      // Ordenar por fecha de creación (más reciente primero)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const config = BusinessConfigModel.fromDynamoDBItem(items[0]);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Active business configuration retrieved in ${duration}ms`, 'BusinessConfigService.getActiveConfig');
      
      return config;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error getting business configuration after ${duration}ms:`, error.stack, 'BusinessConfigService.getActiveConfig');
      
      // Retornar configuración por defecto en caso de error
      this.logger.warn('Returning default configuration due to error', 'BusinessConfigService.getActiveConfig');
      return this.getDefaultConfig();
    }
  }

  async updateConfig(configId: string, updateData: IBusinessConfigUpdate): Promise<IBusinessConfig> {
    const startTime = Date.now();
    this.logger.log(`Updating business configuration ${configId}`, 'BusinessConfigService.updateConfig');

    try {
      if (!configId || typeof configId !== 'string' || configId.trim().length === 0) {
        this.logger.warn('Invalid configuration ID provided', 'BusinessConfigService.updateConfig');
        throw new BadRequestException('Configuration ID is required and must be a valid string.');
      }

      // Verificar que la configuración existe
      const existingConfig = await this.dynamoDBService.get(TABLE_NAMES.BUSINESS_CONFIG, {
        PK: `BUSINESS_CONFIG#${configId}`,
        SK: `BUSINESS_CONFIG#${configId}`,
      });

      if (!existingConfig) {
        this.logger.warn(`Configuration ${configId} not found`, 'BusinessConfigService.updateConfig');
        throw new NotFoundException(`Business configuration with ID '${configId}' not found.`);
      }

      // Preparar datos de actualización
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Agregar campos a actualizar
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updateData[key];
        }
      });

      // Siempre actualizar timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      // Actualizar en base de datos
      await this.dynamoDBService.update(
        TABLE_NAMES.BUSINESS_CONFIG,
        { PK: `BUSINESS_CONFIG#${configId}`, SK: `BUSINESS_CONFIG#${configId}` },
        `SET ${updateExpression.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
      );

      // Retornar configuración actualizada
      const updatedItem = await this.dynamoDBService.get(TABLE_NAMES.BUSINESS_CONFIG, {
        PK: `BUSINESS_CONFIG#${configId}`,
        SK: `BUSINESS_CONFIG#${configId}`,
      });

      if (!updatedItem) {
        this.logger.error(`Configuration ${configId} not found after update`, 'BusinessConfigService.updateConfig');
        throw new BadRequestException('Configuration not found after update. Please try again.');
      }

      const updatedConfig = BusinessConfigModel.fromDynamoDBItem(updatedItem);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Business configuration ${configId} updated successfully in ${duration}ms`, 'BusinessConfigService.updateConfig');
      
      return updatedConfig;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error updating business configuration after ${duration}ms: ${error.message}`, 'BusinessConfigService.updateConfig');
        throw error;
      }

      this.logger.error(`Unexpected error updating business configuration after ${duration}ms:`, error.stack, 'BusinessConfigService.updateConfig');
      throw new BadRequestException('Unable to update business configuration at this time. Please try again later.');
    }
  }

  async createConfig(createData: IBusinessConfigCreate): Promise<IBusinessConfig> {
    const startTime = Date.now();
    this.logger.log('Creating new business configuration', 'BusinessConfigService.createConfig');

    try {
      const configModel = new BusinessConfigModel(createData);
      
      await this.dynamoDBService.put(TABLE_NAMES.BUSINESS_CONFIG, configModel.toDynamoDBItem());

      const duration = Date.now() - startTime;
      this.logger.log(`Business configuration ${configModel.id} created successfully in ${duration}ms`, 'BusinessConfigService.createConfig');
      
      return configModel;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error creating business configuration after ${duration}ms:`, error.stack, 'BusinessConfigService.createConfig');
      throw new BadRequestException('Unable to create business configuration at this time. Please try again later.');
    }
  }

  private createDefaultConfig(): IBusinessConfig {
    this.logger.log('Creating default business configuration', 'BusinessConfigService.createDefaultConfig');
    
    const defaultConfig = new BusinessConfigModel({
      businessName: 'Despedida de año G&G',
      businessAddress: 'Av. Principal 123, Ciudad',
      businessPhone: '+1 (555) 123-4567',
      businessEmail: 'info@groovebar.com',
      businessTaxId: 'RUC: 12345678901',
      businessWebsite: 'fest-go.com',
      currency: 'ARS',
      taxRate: 10,
      thankYouMessage: '¡Gracias por su compra!',
      receiptFooter: 'Sistema de Barras Fest-Go'
    });

    // Guardar configuración por defecto de forma asíncrona
    this.dynamoDBService.put(TABLE_NAMES.BUSINESS_CONFIG, defaultConfig.toDynamoDBItem())
      .catch(error => {
        this.logger.error('Failed to save default business configuration:', error.message, 'BusinessConfigService.createDefaultConfig');
      });

    return defaultConfig;
  }

  private getDefaultConfig(): IBusinessConfig {
    return new BusinessConfigModel({
      businessName: 'Despedida de año G&G',
      businessAddress: 'Av. Principal 123, Ciudad',
      businessPhone: '+1 (555) 123-4567',
      businessEmail: 'info@groovebar.com',
      businessTaxId: 'RUC: 12345678901',
      businessWebsite: 'fest-go.com',
      currency: 'ARS',
      taxRate: 10,
      thankYouMessage: '¡Gracias por su compra!',
      receiptFooter: 'Sistema de Barras Fest-Go'
    });
  }
}
