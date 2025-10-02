import { Module } from '@nestjs/common';
import { EventController } from './controllers/event.controller';
import { EventService } from './services/event.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EventController],
  providers: [EventService, DynamoDBService],
  exports: [EventService],
})
export class EventsModule {}
