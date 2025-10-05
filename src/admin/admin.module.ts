import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { PrinterController } from './controllers/printer.controller';
import { AdminService } from './services/admin.service';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [AdminController, PrinterController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
