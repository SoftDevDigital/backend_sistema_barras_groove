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
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { TicketService } from '../services/ticket.service';
import { 
  CreateTicketDto, 
  UpdateTicketDto, 
  AddTicketItemDto, 
  UpdateTicketItemDto,
  ProcessPaymentDto,
  TicketQueryDto,
  TicketStatsQueryDto
} from '../dto/ticket.dto';
import { ITicket, ITicketItem, ITicketStats, ITicketPrintFormat } from '../../shared/interfaces/ticket.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RoleGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ===== RUTAS SIMPLIFICADAS AL MÁXIMO =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'bartender')
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @Request() req: any
  ): Promise<ITicket> {
    return this.ticketService.create(createTicketDto, req.user.sub);
  }

  @Get('search')
  @Roles('admin', 'bartender')
  async searchTickets(
    @Query() query: TicketQueryDto,
    @Request() req: any
  ): Promise<ITicket[]> {
    // Si es bartender, solo puede ver sus propios tickets
    if (req.user.role === 'bartender') {
      query.employeeId = req.user.sub;
    }
    return this.ticketService.findAll(query);
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@Query() query: TicketStatsQueryDto): Promise<ITicketStats> {
    return this.ticketService.getStats(query);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<ITicket> {
    const ticket = await this.ticketService.findOne(id);
    
    // Si es bartender, solo puede ver sus propios tickets
    if (req.user.role === 'bartender' && ticket.employeeId !== req.user.sub) {
      throw new BadRequestException('Access denied. You can only view your own tickets.');
    }
    
    return ticket;
  }

  @Patch(':id')
  @Roles('admin', 'bartender')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any
  ): Promise<ITicket | ITicketItem> {
    // Verificar permisos específicos por operación
    const ticket = await this.ticketService.findOne(id);
    
    // Si es bartender, solo puede modificar sus propios tickets
    if (req.user.role === 'bartender' && ticket.employeeId !== req.user.sub) {
      throw new BadRequestException('Access denied. You can only modify your own tickets.');
    }
    
    // Determinar tipo de operación por el contenido del body
    if (updateData.paymentMethod && updateData.paidAmount) {
      // Procesar pago - Todos los roles pueden procesar pagos
      return this.ticketService.processPayment(id, updateData);
    } else if (updateData.productId && updateData.quantity) {
      // Agregar item - Todos los roles
      return this.ticketService.addItem(id, updateData);
    } else {
      // Actualizar ticket - Todos los roles autorizados
      return this.ticketService.update(id, updateData);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'bartender')
  async delete(
    @Param('id') id: string,
    @Query('itemId') itemId?: string,
    @Request() req?: any
  ): Promise<void> {
    // Verificar permisos - Solo quien creó el ticket puede eliminarlo
    if (req && req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.employeeId !== req.user.sub) {
        throw new BadRequestException('Access denied. You can only delete your own tickets.');
      }
    }
    
    if (itemId) {
      // Eliminar item específico
      return this.ticketService.removeItem(id, itemId);
    } else {
      // Eliminar ticket completo
      return this.ticketService.delete(id);
    }
  }

  // ===== TICKET PRINTING =====

  @Get(':id/print')
  @Roles('admin', 'bartender')
  async getPrintFormat(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<ITicketPrintFormat> {
    // Si es bartender, solo puede imprimir sus propios tickets
    if (req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.employeeId !== req.user.sub) {
        throw new BadRequestException('Access denied. You can only print your own tickets.');
      }
    }
    
    return this.ticketService.getPrintFormat(id);
  }

  @Patch(':id/print')
  @Roles('admin', 'bartender')
  async markAsPrinted(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    // Si es bartender, solo puede marcar como impreso sus propios tickets
    if (req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.employeeId !== req.user.sub) {
        throw new BadRequestException('Access denied. You can only mark your own tickets as printed.');
      }
    }
    
    return this.ticketService.markAsPrinted(id);
  }
}
