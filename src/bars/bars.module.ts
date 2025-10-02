import { Module } from '@nestjs/common';
import { BarController } from './controllers/bar.controller';
import { BarService } from './services/bar.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BarController],
  providers: [BarService, DynamoDBService],
  exports: [BarService],
})
export class BarsModule {}
