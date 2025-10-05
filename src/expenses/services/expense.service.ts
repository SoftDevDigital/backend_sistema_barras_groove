import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { ExpenseModel } from '../../shared/models/expense.model';
import { IExpense, IExpenseCreate } from '../../shared/interfaces/expense.interface';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from '../dto/expense.dto';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<IExpense> {
    const startTime = Date.now();
    this.logger.log(`Creating expense for event ${createExpenseDto.eventId}`, 'ExpenseService.create');

    try {
      // Validar entrada
      if (!createExpenseDto || !createExpenseDto.eventId || !createExpenseDto.type || 
          createExpenseDto.amount === undefined || !createExpenseDto.description) {
        throw new BadRequestException('Event ID, type, amount, and description are required');
      }

      // Crear modelo de expense
      const expenseModel = new ExpenseModel(createExpenseDto);
      
      // Validar modelo
      const validationErrors = expenseModel.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Expense validation failed: ${validationErrors.join(', ')}`);
      }

      // Guardar en base de datos
      await this.dynamoDBService.put(TABLE_NAMES.EXPENSES, expenseModel.toDynamoDBItem());

      const duration = Date.now() - startTime;
      this.logger.log(`Expense ${expenseModel.id} created successfully in ${duration}ms`, 'ExpenseService.create');

      return {
        id: expenseModel.id,
        eventId: expenseModel.eventId,
        type: expenseModel.type,
        amount: expenseModel.amount,
        description: expenseModel.description,
        createdAt: expenseModel.createdAt,
        updatedAt: expenseModel.updatedAt,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        this.logger.warn(`Error creating expense after ${duration}ms: ${error.message}`, 'ExpenseService.create');
        throw error;
      }

      this.logger.error(`Unexpected error creating expense after ${duration}ms:`, error.stack, 'ExpenseService.create');
      throw new BadRequestException('Failed to create expense. Please try again.');
    }
  }

  async findAll(query: ExpenseQueryDto = {}): Promise<IExpense[]> {
    try {
      // Obtener todos los items de la base de datos
      const items = await this.dynamoDBService.scan(TABLE_NAMES.EXPENSES);

      // Convertir items a modelos
      let expenses: IExpense[] = items.map(item => {
        const expense = ExpenseModel.fromDynamoDBItem(item);
        return {
          id: expense.id,
          eventId: expense.eventId,
          type: expense.type,
          amount: expense.amount,
          description: expense.description,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        };
      });
      
      // Aplicar filtros en memoria
      if (query.eventId) {
        expenses = expenses.filter(expense => expense.eventId === query.eventId);
      }
      
      if (query.type) {
        expenses = expenses.filter(expense => expense.type === query.type);
      }
      
      if (query.search) {
        expenses = expenses.filter(expense => 
          expense.description && expense.description.toLowerCase().includes(query.search!.toLowerCase())
        );
      }

      // Aplicar filtros de fecha si están presentes
      if (query.dateFrom) {
        const dateFrom = new Date(query.dateFrom);
        expenses = expenses.filter(expense => new Date(expense.createdAt) >= dateFrom);
      }
      
      if (query.dateTo) {
        const dateTo = new Date(query.dateTo);
        expenses = expenses.filter(expense => new Date(expense.createdAt) <= dateTo);
      }

      // Aplicar ordenamiento
      if (query.sort_by) {
        expenses.sort((a, b) => {
          let aValue: any = a[query.sort_by as keyof IExpense];
          let bValue: any = b[query.sort_by as keyof IExpense];

          if (query.sort_by === 'createdAt' || query.sort_by === 'updatedAt') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          if (query.sort_order === 'desc') {
            return bValue > aValue ? 1 : -1;
          } else {
            return aValue > bValue ? 1 : -1;
          }
        });
      }

      // Aplicar paginación
      const offset = query.offset || 0;
      const limit = query.limit || expenses.length;
      expenses = expenses.slice(offset, offset + limit);

      return expenses;

    } catch (error) {
      this.logger.error(`Error finding expenses:`, error.stack, 'ExpenseService.findAll');
      throw new BadRequestException('Failed to retrieve expenses. Please try again.');
    }
  }

  async findOne(id: string): Promise<IExpense> {
    const startTime = Date.now();
    this.logger.log(`Finding expense ${id}`, 'ExpenseService.findOne');

    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BadRequestException('Expense ID is required and must be a valid string');
      }

      const item = await this.dynamoDBService.get(TABLE_NAMES.EXPENSES, {
        PK: `EXPENSE#${id}`,
        SK: `EXPENSE#${id}`,
      });

      if (!item) {
        throw new NotFoundException(`Expense with ID '${id}' not found`);
      }

      const expense = ExpenseModel.fromDynamoDBItem(item);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Expense ${id} found in ${duration}ms`, 'ExpenseService.findOne');

      return {
        id: expense.id,
        eventId: expense.eventId,
        type: expense.type,
        amount: expense.amount,
        description: expense.description,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error finding expense after ${duration}ms: ${error.message}`, 'ExpenseService.findOne');
        throw error;
      }

      this.logger.error(`Unexpected error finding expense after ${duration}ms:`, error.stack, 'ExpenseService.findOne');
      throw new BadRequestException('Failed to retrieve expense. Please try again.');
    }
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto): Promise<IExpense> {
    const startTime = Date.now();
    this.logger.log(`Updating expense ${id}`, 'ExpenseService.update');

    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BadRequestException('Expense ID is required and must be a valid string');
      }

      // Verificar que el expense existe
      const existingExpense = await this.findOne(id);

      // Preparar datos de actualización
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Agregar campos a actualizar
      if (updateExpenseDto.type !== undefined) {
        updateExpression.push('#type = :type');
        expressionAttributeNames['#type'] = 'type';
        expressionAttributeValues[':type'] = updateExpenseDto.type;
      }

      if (updateExpenseDto.amount !== undefined) {
        updateExpression.push('#amount = :amount');
        expressionAttributeNames['#amount'] = 'amount';
        expressionAttributeValues[':amount'] = updateExpenseDto.amount;
      }

      if (updateExpenseDto.description !== undefined) {
        updateExpression.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = updateExpenseDto.description;
      }

      if (updateExpression.length === 0) {
        throw new BadRequestException('No valid fields to update');
      }

      // Siempre actualizar timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      // Actualizar en base de datos
      await this.dynamoDBService.update(
        TABLE_NAMES.EXPENSES,
        { PK: `EXPENSE#${id}`, SK: `EXPENSE#${id}` },
        `SET ${updateExpression.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
      );

      // Retornar expense actualizado
      const updatedExpense = await this.findOne(id);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Expense ${id} updated successfully in ${duration}ms`, 'ExpenseService.update');

      return updatedExpense;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error updating expense after ${duration}ms: ${error.message}`, 'ExpenseService.update');
        throw error;
      }

      this.logger.error(`Unexpected error updating expense after ${duration}ms:`, error.stack, 'ExpenseService.update');
      throw new BadRequestException('Failed to update expense. Please try again.');
    }
  }

  async remove(id: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Deleting expense ${id}`, 'ExpenseService.remove');

    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BadRequestException('Expense ID is required and must be a valid string');
      }

      // Verificar que el expense existe
      await this.findOne(id);

      // Eliminar de base de datos
      await this.dynamoDBService.delete(TABLE_NAMES.EXPENSES, {
        PK: `EXPENSE#${id}`,
        SK: `EXPENSE#${id}`,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Expense ${id} deleted successfully in ${duration}ms`, 'ExpenseService.remove');

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error deleting expense after ${duration}ms: ${error.message}`, 'ExpenseService.remove');
        throw error;
      }

      this.logger.error(`Unexpected error deleting expense after ${duration}ms:`, error.stack, 'ExpenseService.remove');
      throw new BadRequestException('Failed to delete expense. Please try again.');
    }
  }

  async findByEvent(eventId: string): Promise<IExpense[]> {
    this.logger.log(`Finding expenses for event ${eventId}`, 'ExpenseService.findByEvent');

    try {
      if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
        throw new BadRequestException('Event ID is required and must be a valid string');
      }

      // Usar findAll con filtro de eventId
      const allExpenses = await this.findAll({ eventId });
      this.logger.log(`Found ${allExpenses.length} expenses for event ${eventId}`, 'ExpenseService.findByEvent');

      return allExpenses;

    } catch (error) {
      this.logger.error(`Error finding expenses by event:`, error.stack, 'ExpenseService.findByEvent');
      throw new BadRequestException('Failed to retrieve expenses for event. Please try again.');
    }
  }

  async getStats(eventId?: string): Promise<{
    total: number;
    totalAmount: number;
    averageAmount: number;
    byType: Record<string, { count: number; totalAmount: number }>;
  }> {
    const startTime = Date.now();
    this.logger.log(`Getting expense stats for event ${eventId || 'all'}`, 'ExpenseService.getStats');

    try {
      let expenses: IExpense[];

      if (eventId) {
        expenses = await this.findByEvent(eventId);
      } else {
        expenses = await this.findAll();
      }

      const stats = {
        total: expenses.length,
        totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        averageAmount: 0,
        byType: {} as Record<string, { count: number; totalAmount: number }>,
      };

      // Calcular promedio
      if (expenses.length > 0) {
        stats.averageAmount = stats.totalAmount / expenses.length;
      }

      // Agrupar por tipo
      expenses.forEach(expense => {
        if (!stats.byType[expense.type]) {
          stats.byType[expense.type] = { count: 0, totalAmount: 0 };
        }
        stats.byType[expense.type].count++;
        stats.byType[expense.type].totalAmount += expense.amount;
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Expense stats calculated in ${duration}ms`, 'ExpenseService.getStats');

      return stats;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error getting expense stats after ${duration}ms:`, error.stack, 'ExpenseService.getStats');
      throw new BadRequestException('Failed to calculate expense statistics. Please try again.');
    }
  }
}
