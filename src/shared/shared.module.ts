import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './services/dynamodb.service';
import { DatabaseInitService } from './services/database-init.service';
import { ThermalPrinterService } from './services/thermal-printer.service';

@Global()
@Module({
  providers: [DynamoDBService, DatabaseInitService, ThermalPrinterService],
  exports: [DynamoDBService, DatabaseInitService, ThermalPrinterService],
})
export class SharedModule {}
