import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { ProductModel } from '../../shared/models/product.model';
import { IProduct, IProductCreate, IProductUpdate, IProductKey, IProductStockUpdate, IProductStockAlert } from '../../shared/interfaces/product.interface';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, StockUpdateDto } from '../dto/product.dto';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class ProductService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createProductDto: CreateProductDto): Promise<IProduct> {
    // Validar que la tecla rápida sea única si se proporciona
    if (createProductDto.quickKey) {
      await this.validateQuickKeyUniqueness(createProductDto.quickKey);
    }

    const product = new ProductModel(createProductDto);
    const validationErrors = product.validate();
    
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
    }

    if (!product.isValidQuickKey()) {
      throw new BadRequestException('Quick key must contain only uppercase letters and numbers');
    }

    try {
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, product.toDynamoDB());
      return product;
    } catch (error) {
      throw new BadRequestException(`Failed to create product: ${error.message}`);
    }
  }

  async findAll(query: ProductQueryDto): Promise<IProduct[]> {
    try {
      // Por ahora usar scan hasta que tengamos los índices GSI configurados
      const result = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);
      
      let products: IProduct[] = result.map(item => ProductModel.fromDynamoDB(item));
      
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
        }
      } else if (query.active !== undefined) {
        // Compatibilidad con el parámetro active
        products = products.filter(product => product.active === query.active);
      }

      // Filtros adicionales
      if (query.category) {
        products = products.filter(product => 
          product.category.toLowerCase().includes(query.category!.toLowerCase())
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
      
      return products;
    } catch (error) {
      throw new BadRequestException(`Failed to fetch products: ${error.message}`);
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
      const result = await this.dynamoDBService.get(TABLE_NAMES.PRODUCTS, {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`,
      });

      if (!result) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return ProductModel.fromDynamoDB(result);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch product: ${error.message}`);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<IProduct> {
    const existingProduct = await this.findOne(id);

    // Validar que la nueva tecla rápida sea única si se está cambiando
    if (updateProductDto.quickKey && updateProductDto.quickKey !== existingProduct.quickKey) {
      await this.validateQuickKeyUniqueness(updateProductDto.quickKey, id);
    }

    const product = ProductModel.fromDynamoDB(existingProduct);
    product.update(updateProductDto);

    const validationErrors = product.validate();
    if (validationErrors.length > 0) {
      throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
    }

    if (!product.isValidQuickKey()) {
      throw new BadRequestException('Quick key must contain only uppercase letters and numbers');
    }

    try {
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, product.toDynamoDB());
      return product;
    } catch (error) {
      throw new BadRequestException(`Failed to update product: ${error.message}`);
    }
  }

  async remove(id: string): Promise<{ message: string; deletedProduct: IProduct }> {
    const product = await this.findOne(id);

    // Verificar si el producto tiene tickets asociados
    const hasTickets = await this.checkProductHasTickets(id);
    if (hasTickets) {
      throw new ConflictException('Cannot delete product with associated tickets');
    }

    try {
      await this.dynamoDBService.delete(TABLE_NAMES.PRODUCTS, {
        PK: `PRODUCT#${id}`,
        SK: `PRODUCT#${id}`,
      });

      return {
        message: 'Product deleted successfully',
        deletedProduct: product,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete product: ${error.message}`);
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
    const product = await this.findOne(productId);
    const productModel = new ProductModel({
      ...product,
      quickKey: product.quickKey || undefined,
    });

    switch (stockUpdateDto.type) {
      case 'add':
        productModel.addStock(stockUpdateDto.quantity);
        break;
      case 'subtract':
        if (!productModel.subtractStock(stockUpdateDto.quantity)) {
          throw new BadRequestException('Insufficient stock');
        }
        break;
      case 'set':
        productModel.setStock(stockUpdateDto.quantity);
        break;
      default:
        throw new BadRequestException('Invalid stock update type');
    }

    try {
      await this.dynamoDBService.put(TABLE_NAMES.PRODUCTS, productModel.toDynamoDB());
      return productModel;
    } catch (error) {
      throw new BadRequestException(`Failed to update stock: ${error.message}`);
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
