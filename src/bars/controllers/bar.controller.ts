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
import { BarService } from '../services/bar.service';
import { CreateBarDto, UpdateBarDto, BarQueryDto } from '../dto/bar.dto';
import { IBar } from '../../shared/interfaces/bar.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('bars')
@UseGuards(JwtAuthGuard, RoleGuard)
export class BarController {
  constructor(private readonly barService: BarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(@Body() createBarDto: CreateBarDto): Promise<IBar> {
    return this.barService.create(createBarDto);
  }

  @Get()
  @Roles('admin', 'bartender')
  async findAll(@Query() query: BarQueryDto): Promise<IBar[]> {
    return this.barService.findAll(query);
  }

  @Get('event/:eventId')
  @Roles('admin', 'bartender')
  async findByEvent(@Param('eventId') eventId: string): Promise<IBar[]> {
    return this.barService.findByEvent(eventId);
  }

  @Get('status/:status')
  @Roles('admin', 'bartender')
  async findByStatus(@Param('status') status: 'active' | 'closed'): Promise<IBar[]> {
    return this.barService.findByStatus(status);
  }

  @Get(':id/sales-summary')
  @Roles('admin')
  async getBarSalesSummary(@Param('id') id: string): Promise<{
    bar: IBar;
    totalSales: number;
    totalTickets: number;
    totalRevenue: number;
    averageTicketValue: number;
    productsSold: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      percentage: number;
    }>;
    productsSoldByPaymentMethod: {
      cash: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      card: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      transfer: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      administrator: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      dj: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
    };
    salesByUser: Array<{
      userId: string;
      userName: string;
      ticketCount: number;
      totalSales: number;
    }>;
    salesByPaymentMethod: {
      cash: number;
      card: number;
      transfer: number;
      administrator: number;
      dj: number;
    };
    hourlyDistribution: Array<{
      hour: string;
      ticketCount: number;
      revenue: number;
    }>;
  }> {
    return this.barService.getBarSalesSummary(id);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  async findOne(@Param('id') id: string): Promise<IBar> {
    return this.barService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateBarDto: UpdateBarDto): Promise<IBar> {
    return this.barService.update(id, updateBarDto);
  }

  @Patch(':id/status/:status')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async changeStatus(
    @Param('id') id: string, 
    @Param('status') status: 'active' | 'closed'
  ): Promise<IBar> {
    return this.barService.changeStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string; deletedBar: IBar }> {
    return this.barService.remove(id);
  }
}
