import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './services/dynamodb.service';

@Global()
@Module({
  providers: [DynamoDBService],
  exports: [DynamoDBService],
})
export class SharedModule {}
