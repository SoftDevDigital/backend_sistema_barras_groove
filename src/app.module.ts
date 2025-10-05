import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { BarsModule } from './bars/bars.module';
import { ProductsModule } from './products/products.module';
import { EmployeesModule } from './employees/employees.module';
import { TicketsModule } from './tickets/tickets.module';
import { StockModule } from './stock/stock.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    AuthModule,
    EventsModule,
    BarsModule,
    ProductsModule,
    EmployeesModule,
    TicketsModule,
    StockModule,
    ExpensesModule,
    AdminModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
