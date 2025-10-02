import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './services/dynamodb.service';
import { DatabaseInitService } from './services/database-init.service';

@Global()
@Module({
  providers: [DynamoDBService, DatabaseInitService],
  exports: [DynamoDBService, DatabaseInitService],
})
export class SharedModule {}
