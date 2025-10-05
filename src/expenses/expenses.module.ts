import { Module } from '@nestjs/common';
import { ExpenseController } from './controllers/expense.controller';
import { ExpenseService } from './services/expense.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ExpenseController],
  providers: [ExpenseService, DynamoDBService],
  exports: [ExpenseService],
})
export class ExpensesModule {}
