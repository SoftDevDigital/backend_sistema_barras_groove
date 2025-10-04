import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { 
  StockMovementModel, 
  BarStockModel, 
  GlobalStockModel, 
  StockAlertModel, 
  StockTransferModel 
} from '../../shared/models/stock.model';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  StockMovementQueryDto,
  CreateBarStockDto,
  UpdateBarStockDto,
  BarStockQueryDto,
  UpdateGlobalStockDto,
  GlobalStockQueryDto,
  StockAlertQueryDto,
  AcknowledgeAlertDto,
  CreateStockTransferDto,
  UpdateStockTransferDto,
  StockTransferQueryDto,
  StockReportQueryDto,
  BulkStockOperationDto,
  StockValidationDto,
  StockStatsQueryDto
} from '../dto/stock.dto';
import {
  IStockMovement,
  IBarStock,
  IGlobalStock,
  IStockAlert,
  IStockTransfer,
  IStockReport,
  IStockStats,
  IStockValidation
} from '../../shared/interfaces/stock.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';
import { ProductService } from '../../products/services/product.service';
import { EmployeeService } from '../../employees/services/employee.service';
import { BarService } from '../../bars/services/bar.service';
import { EventService } from '../../events/services/event.service';
import { BusinessConfigService } from '../../shared/services/business-config.service';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly productService: ProductService,
    private readonly employeeService: EmployeeService,
    private readonly barService: BarService,
    private readonly eventService: EventService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  // ===== STOCK MOVEMENTS =====

  async createMovement(createMovementDto: CreateStockMovementDto, recordedBy: string): Promise<IStockMovement> {
    const startTime = Date.now();
    this.logger.log(`Creating stock movement for product ${createMovementDto.productId}`, 'StockService.createMovement');

    try {
      // Validar entrada
      if (!createMovementDto || !createMovementDto.productId || !createMovementDto.quantity) {
        throw new BadRequestException('Product ID and quantity are required for stock movement');
      }

      // Obtener información del empleado
      const employee = await this.employeeService.findOne(recordedBy);
      
      // Obtener información del producto
      const product = await this.productService.findOne(createMovementDto.productId);

      let barName = '';
      let eventName = '';

      // Si es movimiento por barra, obtener información de barra y evento
      if (createMovementDto.barId) {
        const bar = await this.barService.findOne(createMovementDto.barId);
        barName = bar.name;
        
        if (createMovementDto.eventId) {
          const event = await this.eventService.findOne(createMovementDto.eventId);
          eventName = event.name;
        }
      }

      // Obtener stock actual para calcular cantidades
      let previousQuantity = 0;
      let newQuantity = createMovementDto.quantity;

      if (createMovementDto.barId) {
        const barStock = await this.findBarStockByProductAndBar(createMovementDto.productId, createMovementDto.barId, createMovementDto.eventId);
        previousQuantity = barStock ? barStock.currentStock : 0;
        
        switch (createMovementDto.type) {
          case 'initial':
            newQuantity = createMovementDto.quantity;
            break;
          case 'replenish':
            newQuantity = previousQuantity + createMovementDto.quantity;
            break;
          case 'adjustment':
            newQuantity = previousQuantity + createMovementDto.quantity;
            break;
          case 'transfer':
            newQuantity = previousQuantity - createMovementDto.quantity;
            break;
        }
      }

      // Crear movimiento de stock
      const movementModel = new StockMovementModel({
        ...createMovementDto,
        productName: product.name,
        barName,
        eventName,
        previousQuantity,
        newQuantity,
        recordedBy,
        recordedByName: employee.name,
      });

      // Guardar movimiento
      await this.dynamoDBService.put(TABLE_NAMES.STOCK_MOVEMENTS, movementModel.toDynamoDBItem());

      // Actualizar stock correspondiente
      await this.updateStockFromMovement(createMovementDto, newQuantity);

      // Verificar alertas
      await this.checkAndCreateAlerts(createMovementDto.productId, createMovementDto.barId, newQuantity);

      const duration = Date.now() - startTime;
      this.logger.log(`Stock movement created successfully in ${duration}ms`, 'StockService.createMovement');

      return {
        id: movementModel.id,
        productId: movementModel.productId,
        productName: movementModel.productName,
        barId: movementModel.barId,
        barName: movementModel.barName,
        eventId: movementModel.eventId,
        eventName: movementModel.eventName,
        type: movementModel.type,
        quantity: movementModel.quantity,
        previousQuantity: movementModel.previousQuantity,
        newQuantity: movementModel.newQuantity,
        reason: movementModel.reason,
        ticketId: movementModel.ticketId,
        recordedBy: movementModel.recordedBy,
        recordedByName: movementModel.recordedByName,
        createdAt: movementModel.createdAt,
        updatedAt: movementModel.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error creating stock movement after ${duration}ms: ${error.message}`, 'StockService.createMovement');
        throw error;
      }

      this.logger.error(`Unexpected error creating stock movement after ${duration}ms:`, error.stack, 'StockService.createMovement');
      throw new BadRequestException('Unable to create stock movement at this time. Please try again later.');
    }
  }

  async findMovements(query: StockMovementQueryDto = {}): Promise<IStockMovement[]> {
    const startTime = Date.now();
    this.logger.log('Searching stock movements with filters', 'StockService.findMovements');

    try {
      let items: Record<string, any>[] = [];

      // Construir query según los filtros
      if (query.productId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_MOVEMENTS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `PRODUCT#${query.productId}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );
      } else if (query.barId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_MOVEMENTS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `BAR#${query.barId}` },
          { 'GSI2': 'GSI2PK, GSI2SK' }
        );
      } else if (query.eventId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_MOVEMENTS,
          'GSI3PK = :gsi3pk',
          { ':gsi3pk': `EVENT#${query.eventId}` },
          { 'GSI3': 'GSI3PK, GSI3SK' }
        );
      } else {
        items = await this.dynamoDBService.scan(TABLE_NAMES.STOCK_MOVEMENTS);
      }

      // Filtrar resultados en memoria
      let filteredItems = items.filter(item => {
        try {
          if (query.type && item.type !== query.type) return false;
          if (query.ticketId && item.ticketId !== query.ticketId) return false;
          if (query.dateFrom && item.createdAt < query.dateFrom) return false;
          if (query.dateTo && item.createdAt > query.dateTo) return false;
          return true;
        } catch (filterError) {
          this.logger.warn(`Error filtering movement ${item.id}:`, filterError.message, 'StockService.findMovements');
          return false;
        }
      });

      const movements = filteredItems.map(item => {
        const movement = StockMovementModel.fromDynamoDBItem(item);
        return {
          id: movement.id,
          productId: movement.productId,
          productName: movement.productName,
          barId: movement.barId,
          barName: movement.barName,
          eventId: movement.eventId,
          eventName: movement.eventName,
          type: movement.type,
          quantity: movement.quantity,
          previousQuantity: movement.previousQuantity,
          newQuantity: movement.newQuantity,
          reason: movement.reason,
          ticketId: movement.ticketId,
          recordedBy: movement.recordedBy,
          recordedByName: movement.recordedByName,
          createdAt: movement.createdAt,
          updatedAt: movement.updatedAt,
        };
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully retrieved ${movements.length} stock movements in ${duration}ms`, 'StockService.findMovements');
      
      return movements;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error retrieving stock movements after ${duration}ms:`, error.stack, 'StockService.findMovements');
      return [];
    }
  }

  // ===== BAR STOCK =====

  async assignStockToBar(createBarStockDto: CreateBarStockDto, recordedBy: string): Promise<IBarStock> {
    const startTime = Date.now();
    this.logger.log(`Assigning stock to bar ${createBarStockDto.barId}`, 'StockService.assignStockToBar');

    try {
      // Validar entrada
      if (!createBarStockDto || !createBarStockDto.productId || !createBarStockDto.barId) {
        throw new BadRequestException('Product ID, Bar ID, and initial stock are required');
      }

      // Verificar que el producto existe
      const product = await this.productService.findOne(createBarStockDto.productId);
      
      // Verificar que la barra existe
      const bar = await this.barService.findOne(createBarStockDto.barId);
      
      // Verificar que el evento existe
      const event = await this.eventService.findOne(createBarStockDto.eventId);

      // Verificar que no existe stock ya asignado para este producto/barra/evento
      const existingStock = await this.findBarStockByProductAndBar(
        createBarStockDto.productId, 
        createBarStockDto.barId, 
        createBarStockDto.eventId
      );

      if (existingStock) {
        throw new ConflictException(`Stock already assigned for product ${product.name} in bar ${bar.name} for event ${event.name}`);
      }

      // Verificar que hay stock global disponible
      const globalStock = await this.getGlobalStock(createBarStockDto.productId);
      
      if (globalStock.availableStock < createBarStockDto.initialStock) {
        throw new BadRequestException(
          `Insufficient global stock. Available: ${globalStock.availableStock}, requested: ${createBarStockDto.initialStock}`
        );
      }

      // Crear stock de barra
      const barStockModel = new BarStockModel({
        ...createBarStockDto,
        productName: product.name,
        barName: bar.name,
        eventName: event.name,
        currentStock: createBarStockDto.initialStock,
        status: 'active',
      });

      // Guardar stock de barra
      await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, barStockModel.toDynamoDBItem());

      // Actualizar stock global
      await this.updateGlobalStock(createBarStockDto.productId, {
        reservedStock: globalStock.reservedStock + createBarStockDto.initialStock,
      });

      // Crear movimiento de stock inicial
      await this.createMovement({
        productId: createBarStockDto.productId,
        barId: createBarStockDto.barId,
        eventId: createBarStockDto.eventId,
        type: 'initial',
        quantity: createBarStockDto.initialStock,
        reason: 'Initial stock assignment',
      }, recordedBy);

      const duration = Date.now() - startTime;
      this.logger.log(`Stock assigned to bar successfully in ${duration}ms`, 'StockService.assignStockToBar');

      return {
        id: barStockModel.id,
        productId: barStockModel.productId,
        productName: barStockModel.productName,
        barId: barStockModel.barId,
        barName: barStockModel.barName,
        eventId: barStockModel.eventId,
        eventName: barStockModel.eventName,
        initialStock: barStockModel.initialStock,
        currentStock: barStockModel.currentStock,
        finalStock: barStockModel.finalStock,
        totalSold: barStockModel.totalSold,
        totalReplenished: barStockModel.totalReplenished,
        totalTransferred: barStockModel.totalTransferred,
        lastMovement: barStockModel.lastMovement,
        status: barStockModel.status,
        createdAt: barStockModel.createdAt,
        updatedAt: barStockModel.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        this.logger.warn(`Error assigning stock to bar after ${duration}ms: ${error.message}`, 'StockService.assignStockToBar');
        throw error;
      }

      this.logger.error(`Unexpected error assigning stock to bar after ${duration}ms:`, error.stack, 'StockService.assignStockToBar');
      throw new BadRequestException('Unable to assign stock to bar at this time. Please try again later.');
    }
  }

  async findBarStock(query: BarStockQueryDto = {}): Promise<IBarStock[]> {
    const startTime = Date.now();
    this.logger.log('Searching bar stock with filters', 'StockService.findBarStock');

    try {
      let items: Record<string, any>[] = [];

      // Construir query según los filtros
      if (query.barId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.BAR_STOCK,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `BAR#${query.barId}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );
      } else if (query.eventId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.BAR_STOCK,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `EVENT#${query.eventId}` },
          { 'GSI2': 'GSI2PK, GSI2SK' }
        );
      } else if (query.productId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.BAR_STOCK,
          'GSI3PK = :gsi3pk',
          { ':gsi3pk': `PRODUCT#${query.productId}` },
          { 'GSI3': 'GSI3PK, GSI3SK' }
        );
      } else {
        items = await this.dynamoDBService.scan(TABLE_NAMES.BAR_STOCK);
      }

      // Filtrar resultados en memoria
      let filteredItems = items.filter(item => {
        try {
          if (query.status && item.status !== query.status) return false;
          if (query.lowStock && item.currentStock > item.minStock) return false;
          if (query.outOfStock && item.currentStock > 0) return false;
          return true;
        } catch (filterError) {
          this.logger.warn(`Error filtering bar stock ${item.id}:`, filterError.message, 'StockService.findBarStock');
          return false;
        }
      });

      const barStocks = filteredItems.map(item => {
        const barStock = BarStockModel.fromDynamoDBItem(item);
        return {
          id: barStock.id,
          productId: barStock.productId,
          productName: barStock.productName,
          barId: barStock.barId,
          barName: barStock.barName,
          eventId: barStock.eventId,
          eventName: barStock.eventName,
          initialStock: barStock.initialStock,
          currentStock: barStock.currentStock,
          finalStock: barStock.finalStock,
          totalSold: barStock.totalSold,
          totalReplenished: barStock.totalReplenished,
          totalTransferred: barStock.totalTransferred,
          lastMovement: barStock.lastMovement,
          status: barStock.status,
          createdAt: barStock.createdAt,
          updatedAt: barStock.updatedAt,
        };
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully retrieved ${barStocks.length} bar stock records in ${duration}ms`, 'StockService.findBarStock');
      
      return barStocks;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error retrieving bar stock after ${duration}ms:`, error.stack, 'StockService.findBarStock');
      return [];
    }
  }

  // ===== STOCK VALIDATION =====

  async validateStock(stockValidationDto: StockValidationDto): Promise<IStockValidation> {
    try {
      const { productId, barId, quantity: requestedQuantity, operation } = stockValidationDto;
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Obtener stock actual
      let currentStock = 0;
      
      if (barId) {
        const barStock = await this.findBarStockByProductAndBar(productId, barId);
        currentStock = barStock ? barStock.currentStock : 0;
      } else {
        const globalStock = await this.getGlobalStock(productId);
        currentStock = globalStock.availableStock;
      }

      // Validar cantidad solicitada
      if (requestedQuantity <= 0) {
        errors.push('Requested quantity must be greater than 0');
      }

      if (requestedQuantity > currentStock) {
        errors.push(`Insufficient stock. Available: ${currentStock}, requested: ${requestedQuantity}`);
        
        // Sugerencias
        if (currentStock === 0) {
          suggestions.push('Consider replenishing stock before proceeding');
        } else {
          suggestions.push(`Reduce quantity to ${currentStock} or less`);
          suggestions.push('Consider partial fulfillment');
        }
      }

      // Advertencias por stock bajo
      if (currentStock > 0 && currentStock <= 5) {
        warnings.push(`Low stock warning: Only ${currentStock} units remaining`);
      }

      if (currentStock === 0) {
        warnings.push('Product is out of stock');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error) {
      this.logger.error('Error validating stock:', error.stack, 'StockService.validateStock');
      return {
        isValid: false,
        errors: ['Unable to validate stock at this time'],
        warnings: [],
        suggestions: [],
      };
    }
  }

  // ===== AUXILIARY METHODS =====

  private async findBarStockByProductAndBar(
    productId: string, 
    barId: string, 
    eventId?: string
  ): Promise<BarStockModel | null> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.BAR_STOCK,
        'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
        { 
          ':gsi1pk': `BAR#${barId}`,
          ':gsi1sk': `STOCK#${productId}`
        },
        { 'GSI1': 'GSI1PK, GSI1SK' }
      );

      if (items.length === 0) {
        return null;
      }

      const item = items[0];
      
      // Si se especifica eventId, verificar que coincida
      if (eventId && item.eventId !== eventId) {
        return null;
      }

      return BarStockModel.fromDynamoDBItem(item);
    } catch (error) {
      this.logger.warn(`Error finding bar stock for product ${productId} and bar ${barId}:`, error.message, 'StockService.findBarStockByProductAndBar');
      return null;
    }
  }

  private async getGlobalStock(productId: string): Promise<GlobalStockModel> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.GLOBAL_STOCK,
        'GSI1PK = :gsi1pk',
        { ':gsi1pk': `PRODUCT#${productId}` },
        { 'GSI1': 'GSI1PK, GSI1SK' }
      );

      if (items.length > 0) {
        return GlobalStockModel.fromDynamoDBItem(items[0]);
      }

      // Si no existe stock global, crear uno por defecto
      const product = await this.productService.findOne(productId);
      const globalStock = new GlobalStockModel({
        productId,
        productName: product.name,
        totalStock: product.stock || 0,
        reservedStock: 0,
        availableStock: product.stock || 0,
        minStock: product.minStock || 0,
      });

      await this.dynamoDBService.put(TABLE_NAMES.GLOBAL_STOCK, globalStock.toDynamoDBItem());
      return globalStock;
    } catch (error) {
      this.logger.error(`Error getting global stock for product ${productId}:`, error.stack, 'StockService.getGlobalStock');
      throw new BadRequestException('Unable to retrieve global stock information');
    }
  }

  private async updateGlobalStock(productId: string, updateData: Partial<IGlobalStock>): Promise<void> {
    try {
      const globalStock = await this.getGlobalStock(productId);
      
      Object.assign(globalStock, updateData);
      globalStock.updateAvailableStock();
      
      await this.dynamoDBService.put(TABLE_NAMES.GLOBAL_STOCK, globalStock.toDynamoDBItem());
    } catch (error) {
      this.logger.error(`Error updating global stock for product ${productId}:`, error.stack, 'StockService.updateGlobalStock');
      throw new BadRequestException('Unable to update global stock');
    }
  }

  private async updateStockFromMovement(
    movementDto: CreateStockMovementDto, 
    newQuantity: number
  ): Promise<void> {
    try {
      if (movementDto.barId) {
        const barStock = await this.findBarStockByProductAndBar(
          movementDto.productId, 
          movementDto.barId, 
          movementDto.eventId
        );

        if (barStock) {
          switch (movementDto.type) {
            case 'initial':
              barStock.currentStock = newQuantity;
              break;
            case 'replenish':
              barStock.addStock(movementDto.quantity);
              break;
            case 'adjustment':
              barStock.currentStock = newQuantity;
              break;
            case 'transfer':
              barStock.transferStock(movementDto.quantity);
              break;
          }

          await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, barStock.toDynamoDBItem());
        }
      }
    } catch (error) {
      this.logger.error('Error updating stock from movement:', error.stack, 'StockService.updateStockFromMovement');
      throw new BadRequestException('Unable to update stock from movement');
    }
  }

  private async checkAndCreateAlerts(productId: string, barId?: string, currentStock?: number): Promise<void> {
    try {
      const product = await this.productService.findOne(productId);
      
      if (barId) {
        // Verificar alertas de barra
        const barStock = await this.findBarStockByProductAndBar(productId, barId);
        if (barStock && currentStock !== undefined) {
          await this.createStockAlertIfNeeded({
            productId,
            productName: product.name,
            barId,
            barName: barStock.barName,
            currentStock,
            minStock: product.minStock,
          });
        }
      } else {
        // Verificar alertas globales
        const globalStock = await this.getGlobalStock(productId);
        await this.createStockAlertIfNeeded({
          productId,
          productName: product.name,
          currentStock: globalStock.availableStock,
          minStock: product.minStock,
        });
      }
    } catch (error) {
      this.logger.warn(`Error checking alerts for product ${productId}:`, error.message, 'StockService.checkAndCreateAlerts');
    }
  }

  private async createStockAlertIfNeeded(alertData: {
    productId: string;
    productName: string;
    barId?: string;
    barName?: string;
    currentStock: number;
    minStock: number;
  }): Promise<void> {
    try {
      let alertType: 'low_stock' | 'out_of_stock' | 'negative_stock' | null = null;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (alertData.currentStock <= 0) {
        alertType = 'out_of_stock';
        severity = 'critical';
      } else if (alertData.currentStock < 0) {
        alertType = 'negative_stock';
        severity = 'critical';
      } else if (alertData.currentStock <= alertData.minStock) {
        alertType = 'low_stock';
        severity = alertData.currentStock <= (alertData.minStock / 2) ? 'high' : 'medium';
      }

      if (alertType) {
        const alert = new StockAlertModel({
          productId: alertData.productId,
          productName: alertData.productName,
          barId: alertData.barId,
          barName: alertData.barName,
          type: alertType,
          currentStock: alertData.currentStock,
          threshold: alertData.minStock,
          severity,
        });

        await this.dynamoDBService.put(TABLE_NAMES.STOCK_ALERTS, alert.toDynamoDBItem());
      }
    } catch (error) {
      this.logger.warn(`Error creating stock alert:`, error.message, 'StockService.createStockAlertIfNeeded');
    }
  }

  // ===== INTEGRATION WITH TICKETS =====

  async processSaleStock(ticketId: string, items: Array<{productId: string, quantity: number}>, barId: string): Promise<void> {
    try {
      for (const item of items) {
        // Verificar stock de barra
        const barStock = await this.findBarStockByProductAndBar(item.productId, barId);
        
        if (!barStock) {
          throw new BadRequestException(`Product ${item.productId} not assigned to bar ${barId}`);
        }

        if (barStock.currentStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock in bar. Available: ${barStock.currentStock}, requested: ${item.quantity}`
          );
        }

        // Descontar stock de barra
        barStock.subtractStock(item.quantity);
        await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, barStock.toDynamoDBItem());

        // Crear movimiento de stock
        await this.createMovement({
          productId: item.productId,
          barId,
          type: 'adjustment',
          quantity: -item.quantity, // Negative quantity for sale
          ticketId,
          reason: `Sale from ticket ${ticketId}`,
        }, 'system');

        // Verificar alertas
        await this.checkAndCreateAlerts(item.productId, barId, barStock.currentStock);
      }
    } catch (error) {
      this.logger.error('Error processing sale stock:', error.stack, 'StockService.processSaleStock');
      throw new BadRequestException('Unable to process sale stock. Please try again.');
    }
  }

  // ===== MÉTODOS ADICIONALES PARA EL CONTROLADOR SIMPLIFICADO =====

  async updateMovement(id: string, updateData: UpdateStockMovementDto): Promise<IStockMovement> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.STOCK_MOVEMENTS, {
        PK: `MOVEMENT#${id}`,
        SK: `MOVEMENT#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Stock movement with ID '${id}' not found`);
      }

      const movement = StockMovementModel.fromDynamoDBItem(item);
      
      if (updateData.quantity !== undefined) {
        movement.quantity = updateData.quantity;
        movement.newQuantity = updateData.quantity;
      }
      
      if (updateData.reason !== undefined) {
        movement.reason = updateData.reason;
      }

      movement.updatedAt = new Date().toISOString();

      await this.dynamoDBService.put(TABLE_NAMES.STOCK_MOVEMENTS, movement.toDynamoDBItem());

      return {
        id: movement.id,
        productId: movement.productId,
        productName: movement.productName,
        barId: movement.barId,
        barName: movement.barName,
        eventId: movement.eventId,
        eventName: movement.eventName,
        type: movement.type,
        quantity: movement.quantity,
        previousQuantity: movement.previousQuantity,
        newQuantity: movement.newQuantity,
        reason: movement.reason,
        ticketId: movement.ticketId,
        recordedBy: movement.recordedBy,
        recordedByName: movement.recordedByName,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating stock movement ${id}:`, error.stack, 'StockService.updateMovement');
      throw new BadRequestException('Unable to update stock movement. Please try again.');
    }
  }

  async updateBarStock(id: string, updateData: UpdateBarStockDto): Promise<IBarStock> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.BAR_STOCK, {
        PK: `BAR_STOCK#${id}`,
        SK: `BAR_STOCK#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Bar stock with ID '${id}' not found`);
      }

      const barStock = BarStockModel.fromDynamoDBItem(item);
      
      if (updateData.currentStock !== undefined) {
        barStock.currentStock = updateData.currentStock;
      }
      
      if (updateData.finalStock !== undefined) {
        barStock.finalStock = updateData.finalStock;
      }
      
      if (updateData.status !== undefined) {
        barStock.status = updateData.status;
      }

      barStock.updatedAt = new Date().toISOString();
      barStock.lastMovement = new Date().toISOString();

      await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, barStock.toDynamoDBItem());

      return {
        id: barStock.id,
        productId: barStock.productId,
        productName: barStock.productName,
        barId: barStock.barId,
        barName: barStock.barName,
        eventId: barStock.eventId,
        eventName: barStock.eventName,
        initialStock: barStock.initialStock,
        currentStock: barStock.currentStock,
        finalStock: barStock.finalStock,
        totalSold: barStock.totalSold,
        totalReplenished: barStock.totalReplenished,
        totalTransferred: barStock.totalTransferred,
        lastMovement: barStock.lastMovement,
        status: barStock.status,
        createdAt: barStock.createdAt,
        updatedAt: barStock.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating bar stock ${id}:`, error.stack, 'StockService.updateBarStock');
      throw new BadRequestException('Unable to update bar stock. Please try again.');
    }
  }

  async deleteMovement(id: string): Promise<void> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.STOCK_MOVEMENTS, {
        PK: `MOVEMENT#${id}`,
        SK: `MOVEMENT#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Stock movement with ID '${id}' not found`);
      }

      await this.dynamoDBService.delete(TABLE_NAMES.STOCK_MOVEMENTS, {
        PK: `MOVEMENT#${id}`,
        SK: `MOVEMENT#${id}`,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting stock movement ${id}:`, error.stack, 'StockService.deleteMovement');
      throw new BadRequestException('Unable to delete stock movement. Please try again.');
    }
  }

  async deleteBarStock(id: string): Promise<void> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.BAR_STOCK, {
        PK: `BAR_STOCK#${id}`,
        SK: `BAR_STOCK#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Bar stock with ID '${id}' not found`);
      }

      await this.dynamoDBService.delete(TABLE_NAMES.BAR_STOCK, {
        PK: `BAR_STOCK#${id}`,
        SK: `BAR_STOCK#${id}`,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting bar stock ${id}:`, error.stack, 'StockService.deleteBarStock');
      throw new BadRequestException('Unable to delete bar stock. Please try again.');
    }
  }

  async findAlerts(query: StockAlertQueryDto = {}): Promise<IStockAlert[]> {
    try {
      let items: Record<string, any>[] = [];

      if (query.productId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_ALERTS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `PRODUCT#${query.productId}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );
      } else if (query.barId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_ALERTS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `BAR#${query.barId}` },
          { 'GSI2': 'GSI2PK, GSI2SK' }
        );
      } else {
        items = await this.dynamoDBService.scan(TABLE_NAMES.STOCK_ALERTS);
      }

      // Filtrar resultados en memoria
      let filteredItems = items.filter(item => {
        try {
          if (query.type && item.type !== query.type) return false;
          if (query.severity && item.severity !== query.severity) return false;
          if (query.acknowledged !== undefined && item.acknowledged !== query.acknowledged) return false;
          if (query.dateFrom && item.createdAt < query.dateFrom) return false;
          if (query.dateTo && item.createdAt > query.dateTo) return false;
          return true;
        } catch (filterError) {
          this.logger.warn(`Error filtering alert ${item.id}:`, filterError.message, 'StockService.findAlerts');
          return false;
        }
      });

      const alerts = filteredItems.map(item => {
        const alert = StockAlertModel.fromDynamoDBItem(item);
        return {
          id: alert.id,
          productId: alert.productId,
          productName: alert.productName,
          barId: alert.barId,
          barName: alert.barName,
          type: alert.type,
          currentStock: alert.currentStock,
          threshold: alert.threshold,
          severity: alert.severity,
          message: alert.message,
          acknowledged: alert.acknowledged,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt,
          createdAt: alert.createdAt,
        };
      });

      return alerts;
    } catch (error) {
      this.logger.error('Error retrieving stock alerts:', error.stack, 'StockService.findAlerts');
      return [];
    }
  }

  async acknowledgeAlert(id: string, acknowledgeData: AcknowledgeAlertDto, acknowledgedBy: string): Promise<void> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.STOCK_ALERTS, {
        PK: `STOCK_ALERT#${id}`,
        SK: `STOCK_ALERT#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Stock alert with ID '${id}' not found`);
      }

      const alert = StockAlertModel.fromDynamoDBItem(item);
      alert.acknowledge(acknowledgedBy);

      await this.dynamoDBService.put(TABLE_NAMES.STOCK_ALERTS, alert.toDynamoDBItem());
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error acknowledging alert ${id}:`, error.stack, 'StockService.acknowledgeAlert');
      throw new BadRequestException('Unable to acknowledge alert. Please try again.');
    }
  }

  async requestStockTransfer(transferData: CreateStockTransferDto, requestedBy: string): Promise<IStockTransfer> {
    try {
      // Verificar que las barras existen
      const fromBar = await this.barService.findOne(transferData.fromBarId);
      const toBar = await this.barService.findOne(transferData.toBarId);
      const event = await this.eventService.findOne(transferData.eventId);
      const product = await this.productService.findOne(transferData.productId);

      // Verificar que hay stock suficiente en la barra origen
      const fromBarStock = await this.findBarStockByProductAndBar(
        transferData.productId,
        transferData.fromBarId,
        transferData.eventId
      );

      if (!fromBarStock) {
        throw new BadRequestException(`Product ${product.name} not assigned to bar ${fromBar.name}`);
      }

      if (fromBarStock.currentStock < transferData.quantity) {
        throw new BadRequestException(
          `Insufficient stock in source bar. Available: ${fromBarStock.currentStock}, requested: ${transferData.quantity}`
        );
      }

      // Obtener información del empleado
      const employee = await this.employeeService.findOne(requestedBy);

      // Crear transferencia
      const transfer = new StockTransferModel({
        ...transferData,
        productName: product.name,
        fromBarName: fromBar.name,
        toBarName: toBar.name,
        eventName: event.name,
        requestedByName: employee.name,
        status: 'pending',
      });
      
      transfer.requestedBy = requestedBy;

      await this.dynamoDBService.put(TABLE_NAMES.STOCK_TRANSFERS, transfer.toDynamoDBItem());

      return {
        id: transfer.id,
        productId: transfer.productId,
        productName: transfer.productName,
        fromBarId: transfer.fromBarId,
        fromBarName: transfer.fromBarName,
        toBarId: transfer.toBarId,
        toBarName: transfer.toBarName,
        eventId: transfer.eventId,
        eventName: transfer.eventName,
        quantity: transfer.quantity,
        reason: transfer.reason,
        requestedBy: transfer.requestedBy,
        requestedByName: transfer.requestedByName,
        approvedBy: transfer.approvedBy,
        approvedByName: transfer.approvedByName,
        status: transfer.status,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error requesting stock transfer:', error.stack, 'StockService.requestStockTransfer');
      throw new BadRequestException('Unable to request stock transfer. Please try again.');
    }
  }

  async findTransfers(query: StockTransferQueryDto = {}): Promise<IStockTransfer[]> {
    try {
      let items: Record<string, any>[] = [];

      if (query.productId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_TRANSFERS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `PRODUCT#${query.productId}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );
      } else if (query.eventId) {
        items = await this.dynamoDBService.query(
          TABLE_NAMES.STOCK_TRANSFERS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `EVENT#${query.eventId}` },
          { 'GSI2': 'GSI2PK, GSI2SK' }
        );
      } else {
        items = await this.dynamoDBService.scan(TABLE_NAMES.STOCK_TRANSFERS);
      }

      // Filtrar resultados en memoria
      let filteredItems = items.filter(item => {
        try {
          if (query.fromBarId && item.fromBarId !== query.fromBarId) return false;
          if (query.toBarId && item.toBarId !== query.toBarId) return false;
          if (query.status && item.status !== query.status) return false;
          if (query.dateFrom && item.createdAt < query.dateFrom) return false;
          if (query.dateTo && item.createdAt > query.dateTo) return false;
          return true;
        } catch (filterError) {
          this.logger.warn(`Error filtering transfer ${item.id}:`, filterError.message, 'StockService.findTransfers');
          return false;
        }
      });

      const transfers = filteredItems.map(item => {
        const transfer = StockTransferModel.fromDynamoDBItem(item);
        return {
          id: transfer.id,
          productId: transfer.productId,
          productName: transfer.productName,
          fromBarId: transfer.fromBarId,
          fromBarName: transfer.fromBarName,
          toBarId: transfer.toBarId,
          toBarName: transfer.toBarName,
          eventId: transfer.eventId,
          eventName: transfer.eventName,
          quantity: transfer.quantity,
          reason: transfer.reason,
          requestedBy: transfer.requestedBy,
          requestedByName: transfer.requestedByName,
          approvedBy: transfer.approvedBy,
          approvedByName: transfer.approvedByName,
          status: transfer.status,
          createdAt: transfer.createdAt,
          updatedAt: transfer.updatedAt,
        };
      });

      return transfers;
    } catch (error) {
      this.logger.error('Error retrieving stock transfers:', error.stack, 'StockService.findTransfers');
      return [];
    }
  }

  async updateTransferStatus(id: string, updateData: UpdateStockTransferDto, approvedBy: string): Promise<IStockTransfer> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.STOCK_TRANSFERS, {
        PK: `STOCK_TRANSFER#${id}`,
        SK: `STOCK_TRANSFER#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Stock transfer with ID '${id}' not found`);
      }

      const transfer = StockTransferModel.fromDynamoDBItem(item);
      const employee = await this.employeeService.findOne(approvedBy);

      if (updateData.status === 'approved') {
        transfer.approve(approvedBy, employee.name);
        
        // Ejecutar la transferencia
        await this.executeStockTransfer(transfer);
      } else if (updateData.status === 'rejected') {
        transfer.reject(approvedBy, employee.name, updateData.reason);
      }

      await this.dynamoDBService.put(TABLE_NAMES.STOCK_TRANSFERS, transfer.toDynamoDBItem());

      return {
        id: transfer.id,
        productId: transfer.productId,
        productName: transfer.productName,
        fromBarId: transfer.fromBarId,
        fromBarName: transfer.fromBarName,
        toBarId: transfer.toBarId,
        toBarName: transfer.toBarName,
        eventId: transfer.eventId,
        eventName: transfer.eventName,
        quantity: transfer.quantity,
        reason: transfer.reason,
        requestedBy: transfer.requestedBy,
        requestedByName: transfer.requestedByName,
        approvedBy: transfer.approvedBy,
        approvedByName: transfer.approvedByName,
        status: transfer.status,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating transfer status ${id}:`, error.stack, 'StockService.updateTransferStatus');
      throw new BadRequestException('Unable to update transfer status. Please try again.');
    }
  }

  async deleteTransfer(id: string): Promise<void> {
    try {
      const item = await this.dynamoDBService.get(TABLE_NAMES.STOCK_TRANSFERS, {
        PK: `STOCK_TRANSFER#${id}`,
        SK: `STOCK_TRANSFER#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Stock transfer with ID '${id}' not found`);
      }

      await this.dynamoDBService.delete(TABLE_NAMES.STOCK_TRANSFERS, {
        PK: `STOCK_TRANSFER#${id}`,
        SK: `STOCK_TRANSFER#${id}`,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting stock transfer ${id}:`, error.stack, 'StockService.deleteTransfer');
      throw new BadRequestException('Unable to delete stock transfer. Please try again.');
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  private async executeStockTransfer(transfer: StockTransferModel): Promise<void> {
    try {
      // Descontar stock de barra origen
      const fromBarStock = await this.findBarStockByProductAndBar(
        transfer.productId,
        transfer.fromBarId,
        transfer.eventId
      );

      if (fromBarStock) {
        fromBarStock.transferStock(transfer.quantity);
        await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, fromBarStock.toDynamoDBItem());
      }

      // Agregar stock a barra destino
      const toBarStock = await this.findBarStockByProductAndBar(
        transfer.productId,
        transfer.toBarId,
        transfer.eventId
      );

      if (toBarStock) {
        toBarStock.receiveStock(transfer.quantity);
        await this.dynamoDBService.put(TABLE_NAMES.BAR_STOCK, toBarStock.toDynamoDBItem());
      }

      // Marcar transferencia como completada
      transfer.complete();
    } catch (error) {
      this.logger.error('Error executing stock transfer:', error.stack, 'StockService.executeStockTransfer');
      throw new BadRequestException('Unable to execute stock transfer. Please try again.');
    }
  }

  // ===== MÉTODOS PLACEHOLDER (implementar según necesidades) =====

  async getStockStats(query: StockStatsQueryDto): Promise<IStockStats> {
    // Implementar estadísticas de stock
    return {
      totalProducts: 0,
      totalStock: 0,
      totalReserved: 0,
      totalAvailable: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      overStockProducts: 0,
      totalValue: 0,
      activeAlerts: 0,
      pendingTransfers: 0,
    };
  }

  async generateStockReport(query: StockReportQueryDto): Promise<IStockReport> {
    // Implementar reportes de stock
    return {
      eventId: query.eventId || '',
      eventName: '',
      barId: query.barId,
      barName: '',
      productId: query.productId,
      productName: '',
      dateFrom: query.dateFrom || '',
      dateTo: query.dateTo || '',
      summary: {
        totalProducts: 0,
        totalInitialStock: 0,
        totalFinalStock: 0,
        totalSold: 0,
        totalReplenished: 0,
        totalTransferred: 0,
        totalDifferences: 0,
        totalValue: 0,
      },
      products: [],
      movements: [],
      alerts: [],
    };
  }

  async getProductAvailability(productId: string, eventId?: string): Promise<any> {
    // Implementar disponibilidad de producto
    return {
      productId,
      productName: '',
      globalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      barStock: [],
    };
  }

  async getEventStockSummary(eventId: string): Promise<any> {
    // Implementar resumen de stock por evento
    return {
      eventId,
      eventName: '',
      totalProducts: 0,
      totalBars: 0,
      totalInitialStock: 0,
      totalCurrentStock: 0,
      totalSold: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      activeAlerts: 0,
    };
  }

  async getStockConfig(): Promise<any> {
    // Implementar configuración de stock
    return {
      autoReserveStock: true,
      autoGenerateAlerts: true,
      defaultMinStock: 5,
      alertThreshold: 10,
      allowNegativeStock: false,
      requireApprovalForTransfers: true,
    };
  }

  async updateStockConfig(configData: any): Promise<void> {
    // Implementar actualización de configuración
    this.logger.log('Stock config updated:', configData, 'StockService.updateStockConfig');
  }

  async performBulkOperation(bulkData: BulkStockOperationDto, performedBy: string): Promise<any> {
    // Implementar operaciones masivas
    this.logger.log('Bulk operation performed:', bulkData, 'StockService.performBulkOperation');
    return { message: 'Bulk operation completed successfully' };
  }
}
