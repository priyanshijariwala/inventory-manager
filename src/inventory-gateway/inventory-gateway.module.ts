import { Module } from '@nestjs/common';
import { InventoryGatewayService } from './inventory-gateway.service';

@Module({
  providers: [InventoryGatewayService],
  exports: [InventoryGatewayService],
})
export class InventoryGatewayModule {}
