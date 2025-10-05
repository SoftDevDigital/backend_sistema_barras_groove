import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  UseGuards, 
  Logger,
  HttpCode,
  HttpStatus,
  Request
} from '@nestjs/common';
import { CartService } from '../services/cart.service';
import { 
  IBartenderInputResponse,
  ICartSummary,
  IConfirmCartRequest,
  IConfirmCartResponse
} from '../../shared/interfaces/cart.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('bartender')
@UseGuards(JwtAuthGuard, RoleGuard)
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  // Endpoint principal: Procesar entrada del bartender (ej: "CCC2", "FER1")
  @Post('input')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  async processInput(
    @Body() body: { input: string; eventId: string },
    @Request() req: any
  ): Promise<IBartenderInputResponse> {
    this.logger.log(`Processing bartender input: ${body.input}`, 'CartController.processInput');
    
    try {
      const bartenderId = req.user.sub;
      const bartenderName = req.user.email;
      
      const result = await this.cartService.processBartenderInput(
        body.input,
        bartenderId,
        bartenderName,
        body.eventId
      );
      
      this.logger.log(`Input processed successfully: ${body.input}`, 'CartController.processInput');
      return result;
      
    } catch (error) {
      this.logger.error(`Error processing input:`, error.stack, 'CartController.processInput');
      throw error;
    }
  }

  // Ver carrito actual
  @Get('cart')
  @Roles('bartender')
  async getCart(@Request() req: any): Promise<ICartSummary> {
    this.logger.log('Getting cart summary', 'CartController.getCart');
    
    try {
      const bartenderId = req.user.sub;
      const result = await this.cartService.getCartSummary(bartenderId);
      
      this.logger.log(`Cart summary retrieved: ${result.totalItems} items`, 'CartController.getCart');
      return result;
      
    } catch (error) {
      this.logger.error(`Error getting cart:`, error.stack, 'CartController.getCart');
      throw error;
    }
  }

  // Limpiar carrito
  @Delete('cart')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  async clearCart(@Request() req: any): Promise<{ success: boolean; message: string }> {
    this.logger.log('Clearing cart', 'CartController.clearCart');
    
    try {
      const bartenderId = req.user.sub;
      const result = await this.cartService.clearCart(bartenderId);
      
      this.logger.log('Cart cleared successfully', 'CartController.clearCart');
      return result;
      
    } catch (error) {
      this.logger.error(`Error clearing cart:`, error.stack, 'CartController.clearCart');
      throw error;
    }
  }

  // Confirmar carrito y generar ticket
  @Post('cart/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  async confirmCart(
    @Body() request: IConfirmCartRequest,
    @Request() req: any
  ): Promise<IConfirmCartResponse> {
    this.logger.log('Confirming cart and generating ticket', 'CartController.confirmCart');
    
    try {
      const bartenderId = req.user.sub;
      const result = await this.cartService.confirmCart(bartenderId, request);
      
      if (result.success) {
        this.logger.log(`Ticket generated successfully: ${result.ticketId}`, 'CartController.confirmCart');
      } else {
        this.logger.warn(`Cart confirmation failed: ${result.error}`, 'CartController.confirmCart');
      }
      
      return result;
      
    } catch (error) {
      this.logger.error(`Error confirming cart:`, error.stack, 'CartController.confirmCart');
      throw error;
    }
  }

  // Endpoint de prueba para verificar que el sistema funciona
  @Get('test')
  @Roles('bartender')
  async testEndpoint(@Request() req: any): Promise<{ message: string; user: any }> {
    return {
      message: 'Sistema de carrito funcionando correctamente',
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role
      }
    };
  }
}
