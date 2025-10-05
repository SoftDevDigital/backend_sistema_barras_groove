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
  Logger 
} from '@nestjs/common';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from '../dto/expense.dto';
import { IExpense } from '../../shared/interfaces/expense.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ExpenseController {
  private readonly logger = new Logger(ExpenseController.name);

  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(@Body() createExpenseDto: CreateExpenseDto): Promise<IExpense> {
    return this.expenseService.create(createExpenseDto);
  }


  @Get()
  @Roles('admin', 'bartender')
  async findAll(@Query() query: ExpenseQueryDto): Promise<IExpense[]> {
    try {
      const result = await this.expenseService.findAll(query);
      this.logger.log(`findAll returning ${result.length} expenses`, 'ExpenseController.findAll');
      return result;
    } catch (error) {
      this.logger.error(`Error in findAll controller:`, error.stack, 'ExpenseController.findAll');
      throw error;
    }
  }

  @Get('stats')
  @Roles('admin')
  async getStats(@Query('eventId') eventId?: string): Promise<{
    total: number;
    totalAmount: number;
    averageAmount: number;
    byType: Record<string, { count: number; totalAmount: number }>;
  }> {
    return this.expenseService.getStats(eventId);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  async findOne(@Param('id') id: string): Promise<IExpense> {
    return this.expenseService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async update(
    @Param('id') id: string, 
    @Body() updateExpenseDto: UpdateExpenseDto
  ): Promise<IExpense> {
    return this.expenseService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<void> {
    return this.expenseService.remove(id);
  }
}
