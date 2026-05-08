import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { InventoryGatewayModule } from './inventory-gateway/inventory-gateway.module';
import { CommonModule } from './common/common.module';
import { User } from './users/entities/user.entity';
import { Category } from './categories/entities/category.entity';
import { Product } from './products/entities/product.entity';
import { StockMovement } from './stock-movements/entities/stock-movement.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TypeOrmModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'postgres',
    //     host: configService.get<string>('DB_HOST', 'localhost'),
    //     port: Number(configService.get<string>('DB_PORT', '5432')),
    //     username: configService.get<string>('DB_USER', 'postgres'),
    //     password: configService.get<string>('DB_PASSWORD', '1234'),
    //     database: configService.get<string>('DB_NAME', 'inventory_manager'),
    //     entities: [User, Category, Product, StockMovement],
    //     synchronize: true,
    //   }),
    // }),
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: 'db.sqlite',
        autoLoadEntities: true,
        synchronize: true,
      }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    StockMovementsModule,
    InventoryGatewayModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
