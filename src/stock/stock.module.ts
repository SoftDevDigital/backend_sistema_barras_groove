import { Module } from '@nestjs/common';
import { StockController } from './controllers/stock.controller';
import { StockService } from './services/stock.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { BusinessConfigService } from '../shared/services/business-config.service';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { BarsModule } from '../bars/bars.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [AuthModule, EventsModule, BarsModule, ProductsModule],
  controllers: [StockController],
  providers: [StockService, DynamoDBService, BusinessConfigService],
  exports: [StockService],
})
export class StockModule {}
