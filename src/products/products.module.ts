import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [ProductService, DynamoDBService],
  exports: [ProductService],
})
export class ProductsModule {}
