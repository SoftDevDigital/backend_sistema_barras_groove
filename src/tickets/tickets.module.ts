import { Module } from '@nestjs/common';
import { TicketController } from './controllers/ticket.controller';
import { TicketService } from './services/ticket.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { BusinessConfigService } from '../shared/services/business-config.service';
import { StockService } from '../stock/services/stock.service';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { EmployeesModule } from '../employees/employees.module';
import { BarsModule } from '../bars/bars.module';
import { EventsModule } from '../events/events.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    EmployeesModule,
    BarsModule,
    EventsModule,
    StockModule,
  ],
  controllers: [TicketController],
  providers: [TicketService, DynamoDBService, BusinessConfigService, StockService],
  exports: [TicketService],
})
export class TicketsModule {}
