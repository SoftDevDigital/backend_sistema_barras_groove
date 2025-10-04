import { Module } from '@nestjs/common';
import { EmployeeController } from './controllers/employee.controller';
import { EmployeeService } from './services/employee.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, DynamoDBService],
  exports: [EmployeeService],
})
export class EmployeesModule {}
