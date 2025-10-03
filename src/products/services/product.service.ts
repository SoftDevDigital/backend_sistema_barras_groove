import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { CustomLoggerService } from '../../shared/services/logger.service';
import { ProductModel } from '../../shared/models/product.model';
import { IProduct, IProductCreate, IProductUpdate, IProductKey, IProductStockUpdate, IProductStockAlert } from '../../shared/interfaces/product.interface';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, StockUpdateDto } from '../dto/product.dto';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class ProductService {
  private readonly logger = new CustomLoggerService();

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createProductDto: CreateProductDto): Promise<IProduct> {
    try {
      // Validar entrada básica
      if (!createProductDto || !createProductDto.name || !createProductDto.price) {
        throw new BadRequestException('Product name and price are required');
      }

      // Validar que la tecla rápida sea única si se proporciona
      if (createProductDto.quickKey) {
        await this.validateQuickKeyUniqueness(createProductDto.quickKey);
      }

      const product = new ProductModel(createProductDto);
      const validationErrors = product.validate();
      
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Product validation failed: ${validationErrors.join(', ')}`);
      }

      if (!product.isValidQuickKey()) {
        throw new BadRequestException('Quick key must contain only uppercase letters and numbers (max 10 characters)');
      }

      // Intentar crear el producto en la base de datos
      const productData = product.toDynamoDB();
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, productData);
      
      this.logger.success(`Product created: ${product.name} (ID: ${product.id})`, 'ProductService');
      return product;

    } catch (error) {
      // Solo loggear errores inesperados, no errores de validación
      if (!(error instanceof BadRequestException) && !(error instanceof ConflictException)) {
        this.logger.error('Unexpected error creating product:', undefined, 'ProductService');
      }
      
      // Re-lanzar errores de validación sin modificar
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid product data format');
      } else if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictException('Product with this quick key already exists');
      }
      
      // Error genérico
      throw new BadRequestException(`Failed to create product '${createProductDto.name}'. Please try again or contact support if the problem persists.`);
    }
  }

  async findAll(query: ProductQueryDto): Promise<IProduct[]> {
    try {
      // Validar parámetros de paginación
      if (query.limit && (query.limit < 1 || query.limit > 1000)) {
        throw new BadRequestException('Limit must be between 1 and 1000');
      }
      if (query.offset && query.offset < 0) {
        throw new BadRequestException('Offset cannot be negative');
      }

      // Validar parámetros de ordenamiento
      if (query.sort_by && !['name', 'price', 'created_at', 'updated_at', 'stock', 'category'].includes(query.sort_by)) {
        throw new BadRequestException('Invalid sort field. Valid options: name, price, created_at, updated_at, stock, category');
      }
      if (query.sort_order && !['asc', 'desc'].includes(query.sort_order)) {
        throw new BadRequestException('Invalid sort order. Valid options: asc, desc');
      }

      // Obtener productos de la base de datos
      const result = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);
      
      if (!result || !Array.isArray(result)) {
        console.warn('Unexpected result format from DynamoDB scan');
        return [];
      }

      let products: IProduct[] = result.map(item => {
        try {
          return ProductModel.fromDynamoDB(item);
        } catch (error) {
          console.error('Error converting DynamoDB item to product:', error);
          return null;
        }
      }).filter(product => product !== null);
      
      // Aplicar filtros
      if (query.status) {
        switch (query.status) {
          case 'active':
            products = products.filter(product => product.active === true);
            break;
          case 'inactive':
            products = products.filter(product => product.active === false);
            break;
          case 'all':
            // No filtrar por estado
            break;
          default:
            throw new BadRequestException('Invalid status filter. Valid options: active, inactive, all');
        }
      } else if (query.active !== undefined) {
        // Compatibilidad con el parámetro active
        products = products.filter(product => product.active === query.active);
      }

      // Filtros adicionales
      if (query.category && query.category.trim()) {
        products = products.filter(product => 
          product.category && product.category.toLowerCase().includes(query.category!.toLowerCase())
        );
      }

      if (query.low_stock) {
        products = products.filter(product => product.stock <= product.minStock);
      }

      if (query.out_of_stock) {
        products = products.filter(product => product.stock <= 0);
      }

      // Aplicar ordenamiento
      if (query.sort_by) {
        products = this.sortProducts(products, query.sort_by, query.sort_order || 'asc');
      }

      // Aplicar paginación
      if (query.limit || query.offset) {
        const start = query.offset || 0;
        const end = query.limit ? start + query.limit : undefined;
        products = products.slice(start, end);
      }
      
      this.logger.info(`Retrieved ${products.length} products with applied filters`, 'ProductService');
      return products;

    } catch (error) {
      // Solo loggear errores inesperados
      if (!(error instanceof BadRequestException)) {
        this.logger.error('Unexpected error fetching products:', undefined, 'ProductService');
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid query parameters');
      }
      
      throw new BadRequestException('Failed to retrieve products. Please try again or contact support if the problem persists.');
    }
  }

  private async findAllProducts(): Promise<IProduct[]> {
    try {
      const result = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);
      return result.map(item => ProductModel.fromDynamoDB(item));
    } catch (error) {
      throw new BadRequestException(`Failed to fetch all products: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<IProduct> {
    try {
      // Validar ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BadRequestException('Product ID is required and must be a valid string');
      }

      const cleanId = id.trim();
      if (cleanId.length < 10) {
        throw new BadRequestException('Invalid product ID format');
      }

      const result = await this.dynamoDBService.get(TABLE_NAMES.PRODUCTS, {
        PK: `PRODUCT#${cleanId}`,
        SK: `PRODUCT#${cleanId}`,
      });

      if (!result) {
        throw new NotFoundException(`Product with ID '${cleanId}' not found. Please verify the ID and try again.`);
      }

      try {
        const product = ProductModel.fromDynamoDB(result);
        // Log informativo solo en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Product retrieved: ${product.name} (ID: ${product.id})`);
        }
        return product;
      } catch (conversionError) {
        console.error('❌ Error converting DynamoDB result to product:', conversionError);
        throw new BadRequestException('Product data is corrupted. Please contact system administrator.');
      }

    } catch (error) {
      // Solo loggear errores inesperados
      if (!(error instanceof NotFoundException) && !(error instanceof BadRequestException)) {
        console.error(`❌ Unexpected error fetching product '${id}':`, error);
      }
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid product ID format');
      }
      
      throw new BadRequestException(`Failed to retrieve product with ID '${id}'. Please try again or contact support if the problem persists.`);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<IProduct> {
    try {
      // Validar entrada
      if (!updateProductDto || Object.keys(updateProductDto).length === 0) {
        throw new BadRequestException('At least one field must be provided for update');
      }

      // Validar que no se intente cambiar el ID
      if (updateProductDto.name !== undefined && updateProductDto.name.trim().length === 0) {
        throw new BadRequestException('Product name cannot be empty');
      }

      if (updateProductDto.price !== undefined && updateProductDto.price < 0) {
        throw new BadRequestException('Product price cannot be negative');
      }

      // Obtener producto existente
      const existingProduct = await this.findOne(id);

      // Validar que la nueva tecla rápida sea única si se está cambiando
      if (updateProductDto.quickKey && updateProductDto.quickKey !== existingProduct.quickKey) {
        await this.validateQuickKeyUniqueness(updateProductDto.quickKey, id);
      }

      // Crear producto actualizado
      const product = new ProductModel({
        ...existingProduct,
        ...updateProductDto,
        quickKey: existingProduct.quickKey || undefined,
      });
      product.update(updateProductDto);

      // Validar el producto actualizado
      const validationErrors = product.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Update validation failed: ${validationErrors.join(', ')}`);
      }

      if (!product.isValidQuickKey()) {
        throw new BadRequestException('Quick key must contain only uppercase letters and numbers (max 10 characters)');
      }

      // Actualizar en la base de datos
      const productData = product.toDynamoDB();
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, productData);
      
      // Log informativo solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`✏️ Product updated: ${product.name} (ID: ${product.id})`);
      }
      return product;

    } catch (error) {
      // Solo loggear errores inesperados
      if (!(error instanceof NotFoundException) && !(error instanceof BadRequestException) && !(error instanceof ConflictException)) {
        console.error(`❌ Unexpected error updating product '${id}':`, error);
      }
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid update data format');
      } else if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictException('Product data conflict. Please refresh and try again.');
      }
      
      throw new BadRequestException(`Failed to update product with ID '${id}'. Please try again or contact support if the problem persists.`);
    }
  }

  async remove(id: string): Promise<{ message: string; deletedProduct: IProduct }> {
    try {
      // Validar ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BadRequestException('Product ID is required and must be a valid string');
      }

      const cleanId = id.trim();
      
      // Obtener producto existente
      const product = await this.findOne(cleanId);

      // Verificar si el producto tiene tickets asociados
      const hasTickets = await this.checkProductHasTickets(cleanId);
      if (hasTickets) {
        throw new ConflictException(`Cannot delete product '${product.name}' because it has associated sales. Please deactivate it instead.`);
      }

      // Intentar eliminar el producto
      await this.dynamoDBService.delete(TABLE_NAMES.PRODUCTS, {
        PK: `PRODUCT#${cleanId}`,
        SK: `PRODUCT#${cleanId}`,
      });

      // Log informativo solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️ Product deleted: ${product.name} (ID: ${cleanId})`);
      }
      
      return {
        message: `Product '${product.name}' deleted successfully`,
        deletedProduct: product,
      };

    } catch (error) {
      // Solo loggear errores inesperados
      if (!(error instanceof NotFoundException) && !(error instanceof BadRequestException) && !(error instanceof ConflictException)) {
        console.error(`❌ Unexpected error deleting product '${id}':`, error);
      }
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid product ID format');
      }
      
      throw new BadRequestException(`Failed to delete product with ID '${id}'. Please try again or contact support if the problem persists.`);
    }
  }

  async getProductKeys(query: { bar_id?: string }): Promise<IProductKey[]> {
    try {
      // Por ahora usar scan hasta que tengamos los índices GSI configurados
      const result = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);

      return result
        .map(item => ProductModel.fromDynamoDB(item))
        .filter(product => product.active && product.quickKey)
        .map(product => ({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quickKey: product.quickKey!,
          stock: product.stock,
          available: product.available,
        }));
    } catch (error) {
      throw new BadRequestException(`Failed to fetch product keys: ${error.message}`);
    }
  }

  private async validateQuickKeyUniqueness(quickKey: string, excludeId?: string): Promise<void> {
    try {
      // Por ahora usar scan hasta que tengamos los índices GSI configurados
      const result = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);

      const conflictingProducts = result
        .map(item => ProductModel.fromDynamoDB(item))
        .filter(product => product.quickKey === quickKey && (!excludeId || product.id !== excludeId));

      if (conflictingProducts.length > 0) {
        throw new ConflictException(`Quick key '${quickKey}' is already in use by product '${conflictingProducts[0].name}'`);
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to validate quick key: ${error.message}`);
    }
  }

  private async checkProductHasTickets(productId: string): Promise<boolean> {
    try {
      // Por ahora usar scan hasta que tengamos los índices GSI configurados
      const result = await this.dynamoDBService.scan(TABLE_NAMES.TICKETS);
      
      // Buscar tickets que referencien este producto
      const hasTickets = result.some(item => 
        item.GSI1PK === `PRODUCT#${productId}` || 
        item.productId === productId
      );

      return hasTickets;
    } catch (error) {
      // Si hay error consultando tickets, asumir que no hay tickets para ser seguro
      console.warn(`Could not check tickets for product ${productId}:`, error.message);
      return false;
    }
  }

  async searchProducts(searchTerm: string): Promise<IProduct[]> {
    try {
      const allProducts = await this.findAllProducts();
      
      const searchLower = searchTerm.toLowerCase();
      return allProducts.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchLower)) ||
        (product.quickKey && product.quickKey.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      throw new BadRequestException(`Failed to search products: ${error.message}`);
    }
  }

  async getProductStats(): Promise<{ 
    total: number; 
    active: number; 
    inactive: number; 
    withKeys: number;
    lowStock: number;
    outOfStock: number;
    totalStockValue: number;
  }> {
    try {
      const allProducts = await this.findAllProducts();
      
      const stats = {
        total: allProducts.length,
        active: allProducts.filter(p => p.active).length,
        inactive: allProducts.filter(p => !p.active).length,
        withKeys: allProducts.filter(p => p.quickKey && p.quickKey.trim().length > 0).length,
        lowStock: allProducts.filter(p => p.stock <= p.minStock).length,
        outOfStock: allProducts.filter(p => p.stock <= 0).length,
        totalStockValue: allProducts.reduce((total, p) => total + (p.stock * (p.cost || p.price)), 0),
      };

      return stats;
    } catch (error) {
      throw new BadRequestException(`Failed to get product stats: ${error.message}`);
    }
  }

  async updateStock(productId: string, stockUpdateDto: StockUpdateDto): Promise<IProduct> {
    try {
      // Validar entrada
      if (!stockUpdateDto || !stockUpdateDto.type || stockUpdateDto.quantity === undefined) {
        throw new BadRequestException('Stock update type and quantity are required');
      }

      if (stockUpdateDto.quantity < 0) {
        throw new BadRequestException('Stock quantity cannot be negative');
      }

      if (!['add', 'subtract', 'set'].includes(stockUpdateDto.type)) {
        throw new BadRequestException('Invalid stock update type. Valid options: add, subtract, set');
      }

      // Obtener producto existente
      const product = await this.findOne(productId);
      
      // Crear modelo del producto
      const productModel = new ProductModel({
        ...product,
        quickKey: product.quickKey || undefined,
      });

      // Validar operaciones de stock
      switch (stockUpdateDto.type) {
        case 'add':
          productModel.addStock(stockUpdateDto.quantity);
          break;
        case 'subtract':
          if (productModel.stock < stockUpdateDto.quantity) {
            throw new BadRequestException(`Insufficient stock. Current stock: ${productModel.stock}, requested: ${stockUpdateDto.quantity}`);
          }
          productModel.subtractStock(stockUpdateDto.quantity);
          break;
        case 'set':
          productModel.setStock(stockUpdateDto.quantity);
          break;
      }

      // Actualizar en la base de datos
      const productData = productModel.toDynamoDB();
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, productData);
      
      // Log informativo solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Stock updated: ${product.name} ${stockUpdateDto.type} ${stockUpdateDto.quantity} (new: ${productModel.stock})`);
      }
      return productModel;

    } catch (error) {
      // Solo loggear errores inesperados
      if (!(error instanceof NotFoundException) && !(error instanceof BadRequestException)) {
        console.error(`❌ Unexpected error updating stock for product '${productId}':`, error);
      }
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Manejar errores de base de datos
      if (error.name === 'ResourceNotFoundException') {
        throw new BadRequestException('Products table not found. Please contact system administrator');
      } else if (error.name === 'ValidationException') {
        throw new BadRequestException('Invalid stock update data format');
      }
      
      throw new BadRequestException(`Failed to update stock for product with ID '${productId}'. Please try again or contact support if the problem persists.`);
    }
  }

  async getStockAlerts(): Promise<IProductStockAlert[]> {
    try {
      const allProducts = await this.findAllProducts();
      
      const alerts: IProductStockAlert[] = [];
      
      allProducts.forEach(product => {
        if (product.stock <= 0) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            currentStock: product.stock,
            minStock: product.minStock,
            alertType: 'out_of_stock'
          });
        } else if (product.stock <= product.minStock) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            currentStock: product.stock,
            minStock: product.minStock,
            alertType: 'low_stock'
          });
        }
      });

      return alerts;
    } catch (error) {
      throw new BadRequestException(`Failed to get stock alerts: ${error.message}`);
    }
  }

  private sortProducts(products: IProduct[], sortBy: string, order: 'asc' | 'desc'): IProduct[] {
    return products.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'created_at':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updated_at':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        default:
          return 0;
      }

      if (order === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
  }
}
