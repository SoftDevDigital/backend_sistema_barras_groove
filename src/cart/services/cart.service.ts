import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { ProductService } from '../../products/services/product.service';
import { TicketService } from '../../tickets/services/ticket.service';
import { 
  ICart, 
  ICartItem, 
  ICartSummary, 
  IAddToCartRequest, 
  IAddToCartResponse,
  IConfirmCartRequest,
  IConfirmCartResponse,
  IBartenderInput,
  IBartenderInputResponse
} from '../../shared/interfaces/cart.interface';
import { IProduct } from '../../shared/interfaces/product.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private activeCarts: Map<string, ICart> = new Map(); // En memoria para simplicidad

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly productService: ProductService,
    private readonly ticketService: TicketService,
  ) {}

  // Procesar entrada del bartender (ej: "CCC2", "FER1")
  async processBartenderInput(
    input: string, 
    userId: string, 
    userName: string, 
    eventId: string
  ): Promise<IBartenderInputResponse> {
    this.logger.log(`Processing bartender input: ${input}`, 'CartService.processBartenderInput');

    try {
      // Parsear el input (ej: "CCC2" -> code: "CCC", quantity: 2)
      const { code, quantity } = this.parseInput(input);
      
      if (!code || !quantity) {
        throw new BadRequestException('Formato inválido. Use: CODIGO+CANTIDAD (ej: CCC2, FER1)');
      }

      // Buscar producto por código
      const product = await this.findProductByCode(code);
      if (!product) {
        throw new NotFoundException(`Producto con código ${code} no encontrado`);
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`);
      }

      // Agregar al carrito
      const addResult = await this.addToCart({
        productCode: code,
        quantity
      }, userId, userName, eventId);

      if (!addResult.success) {
        throw new BadRequestException(addResult.error || 'Error agregando al carrito');
      }

      // Obtener resumen del carrito
      const cartSummary = await this.getCartSummary(userId);

      return {
        success: true,
        message: `${quantity}x ${product.name} agregado al carrito`,
        product: {
          name: product.name,
          code: product.code,
          price: product.price,
          quantity,
          total: product.price * quantity
        },
        cartSummary
      };

    } catch (error) {
      this.logger.error(`Error processing bartender input:`, error.stack, 'CartService.processBartenderInput');
      return {
        success: false,
        message: 'Error procesando entrada',
        error: error.message
      };
    }
  }

  // Agregar producto al carrito
  async addToCart(
    request: IAddToCartRequest, 
    userId: string, 
    userName: string, 
    eventId: string
  ): Promise<IAddToCartResponse> {
    this.logger.log(`Adding to cart: ${request.productCode}`, 'CartService.addToCart');

    try {
      // Usar directamente el código y cantidad del request
      const code = request.productCode;
      const quantity = request.quantity;
      
      if (!code || !quantity) {
        throw new BadRequestException('Código y cantidad son requeridos');
      }

      // Buscar producto por código
      const product = await this.findProductByCode(code);
      if (!product) {
        throw new NotFoundException(`Producto con código ${code} no encontrado`);
      }

      // Verificar stock
      if (product.stock < quantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${quantity}`);
      }

      // Obtener o crear carrito
      let cart = this.activeCarts.get(userId);
      if (!cart) {
        cart = await this.createCart(userId, userName, eventId);
      }

      // Verificar si el producto ya está en el carrito
      const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex >= 0) {
        // Actualizar cantidad existente
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].total = cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price;
      } else {
        // Agregar nuevo item
        const cartItem: ICartItem = {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          price: product.price,
          quantity,
          total: product.price * quantity,
          unit: product.unit
        };
        cart.items.push(cartItem);
      }

      // Recalcular totales
      this.recalculateCartTotals(cart);
      cart.updatedAt = new Date().toISOString();

      // Guardar carrito
      this.activeCarts.set(userId, cart);

      const cartItem = cart.items.find(item => item.productId === product.id);

      return {
        success: true,
        message: `${quantity}x ${product.name} agregado al carrito`,
        cartItem,
        cartTotal: cart.total
      };

    } catch (error) {
      this.logger.error(`Error adding to cart:`, error.stack, 'CartService.addToCart');
      return {
        success: false,
        message: 'Error agregando al carrito',
        error: error.message
      };
    }
  }

  // Obtener resumen del carrito
  async getCartSummary(userId: string): Promise<ICartSummary> {
    const cart = this.activeCarts.get(userId);
    
    if (!cart) {
      return {
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        items: []
      };
    }

    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      totalItems: cart.items.length,
      totalQuantity,
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
      items: cart.items
    };
  }

  // Limpiar carrito
  async clearCart(userId: string): Promise<{ success: boolean; message: string }> {
    this.activeCarts.delete(userId);
    return {
      success: true,
      message: 'Carrito limpiado correctamente'
    };
  }

  // Confirmar carrito y generar ticket
  async confirmCart(
    userId: string, 
    request: IConfirmCartRequest
  ): Promise<IConfirmCartResponse> {
    this.logger.log(`Confirming cart for user: ${userId}`, 'CartService.confirmCart');

    try {
      // Validar barId
      if (!request.barId) {
        throw new BadRequestException('Bar ID is required to confirm cart');
      }

      const cart = this.activeCarts.get(userId);
      
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Carrito vacío');
      }

      // Verificar stock nuevamente antes de confirmar
      for (const item of cart.items) {
        const product = await this.productService.findOne(item.productId);
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
        }
      }

      // Crear ticket
      const ticketData = {
        eventId: cart.eventId,
        barId: request.barId, // Usar el barId proporcionado en el request
        userId: cart.userId,
        customerName: request.customerName || 'Cliente',
        items: cart.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        paymentMethod: request.paymentMethod || 'cash',
        notes: request.notes
      };

      const ticket = await this.ticketService.create(ticketData, cart.userId);

      // Descontar stock
      for (const item of cart.items) {
        await this.productService.updateStock(item.productId, {
          quantity: item.quantity,
          type: 'subtract',
          reason: `Venta - Ticket ${ticket.id}`
        });
      }

      // Obtener formato de impresión
      const printFormat = await this.ticketService.getPrintFormat(ticket.id);

      // Marcar ticket como impreso automáticamente
      await this.ticketService.markAsPrinted(ticket.id);

      // Marcar carrito como confirmado
      cart.status = 'confirmed';
      this.activeCarts.delete(userId);

      return {
        success: true,
        ticketId: ticket.id,
        message: 'Ticket generado, impreso y stock actualizado correctamente',
        printFormat: printFormat // Formato listo para imprimir
      };

    } catch (error) {
      this.logger.error(`Error confirming cart:`, error.stack, 'CartService.confirmCart');
      return {
        success: false,
        message: 'Error confirmando carrito',
        error: error.message
      };
    }
  }

  // Métodos auxiliares privados
  private parseInput(input: string): { code: string; quantity: number } {
    // Extraer código y cantidad del input (ej: "CCC2" -> code: "CCC", quantity: 2)
    this.logger.log(`Parsing input: "${input}"`, 'CartService.parseInput');
    
    // Limpiar el input de espacios en blanco
    const cleanInput = input.trim();
    
    // Regex para capturar código (2-3 letras) y cantidad (números)
    const match = cleanInput.match(/^([A-Za-z]{2,3})(\d+)$/);
    
    if (!match) {
      this.logger.error(`Invalid input format: "${cleanInput}"`, 'CartService.parseInput');
      throw new BadRequestException('Formato inválido. Use: CODIGO+CANTIDAD (ej: CCC2, FER1)');
    }
    
    const code = match[1].toUpperCase(); // Convertir a mayúsculas
    const quantity = parseInt(match[2], 10);
    
    this.logger.log(`Parsed: code="${code}", quantity=${quantity}`, 'CartService.parseInput');
    return { code, quantity };
  }

  private async findProductByCode(code: string): Promise<IProduct | null> {
    try {
      // Buscar producto por código en la base de datos
      const products = await this.dynamoDBService.scan(TABLE_NAMES.PRODUCTS);
      
      for (const item of products) {
        if (item.code === code && item.active && item.available) {
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            cost: item.cost,
            quickKey: item.quickKey,
            code: item.code,
            category: item.category,
            unit: item.unit,
            stock: item.stock,
            minStock: item.minStock,
            barcode: item.barcode,
            taxRate: item.taxRate,
            available: item.available,
            active: item.active,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error finding product by code:`, error.stack, 'CartService.findProductByCode');
      return null;
    }
  }

  private async createCart(userId: string, userName: string, eventId: string): Promise<ICart> {
    const cart: ICart = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      eventId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activeCarts.set(userId, cart);
    return cart;
  }

  private recalculateCartTotals(cart: ICart): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.tax = 0; // Sin impuestos
    cart.total = cart.subtotal;
  }
}
