import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { DynamoDBService } from '../shared/services/dynamodb.service';
import { appConfig } from '../shared/config/app.config';

@Module({
  imports: [
    JwtModule.register({
      secret: appConfig.jwt.secret,
      signOptions: { expiresIn: appConfig.jwt.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DynamoDBService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
