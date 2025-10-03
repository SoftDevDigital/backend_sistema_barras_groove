import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, StockUpdateDto } from '../dto/product.dto';
import { IProduct, IProductKey, IProductStockAlert } from '../../shared/interfaces/product.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(@Body() createProductDto: CreateProductDto): Promise<IProduct> {
    return this.productService.create(createProductDto);
  }

  @Get()
  @Roles('admin', 'bar_user') // Ambos pueden consultar
  async findAll(@Query() query: ProductQueryDto): Promise<IProduct[] | IProductKey[]> {
    // Si se solicita solo teclas rápidas (contraparte: keys_only=false o sin parámetro = productos completos)
    if (query.keys_only === 'true') {
      return this.productService.getProductKeys({ bar_id: query.bar_id || 'default' });
    }

    // Si hay término de búsqueda, usar búsqueda (contraparte: search vacío = todos los productos)
    if (query.search && query.search.trim().length > 0) {
      return this.productService.searchProducts(query.search);
    }
    
    // Listar productos con filtros (incluye todos los casos restantes)
    return this.productService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'bar_user') // Ambos pueden consultar un producto específico
  async findOne(@Param('id') id: string): Promise<IProduct> {
    return this.productService.findOne(id);
  }

  @Get('stats/summary')
  @Roles('admin') // Solo admin puede ver estadísticas
  async getStats(): Promise<{ 
    total: number; 
    active: number; 
    inactive: number; 
    withKeys: number;
    lowStock: number;
    outOfStock: number;
    totalStockValue: number;
  }> {
    return this.productService.getProductStats();
  }

  @Get('stock/alerts')
  @Roles('admin') // Solo admin puede ver alertas de stock
  async getStockAlerts(): Promise<IProductStockAlert[]> {
    return this.productService.getStockAlerts();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede modificar
  async update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto
  ): Promise<IProduct> {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede actualizar stock
  async updateStock(
    @Param('id') id: string,
    @Body() stockUpdateDto: StockUpdateDto
  ): Promise<IProduct> {
    return this.productService.updateStock(id, stockUpdateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede eliminar
  async remove(@Param('id') id: string): Promise<{ message: string; deletedProduct: IProduct }> {
    return this.productService.remove(id);
  }
}
