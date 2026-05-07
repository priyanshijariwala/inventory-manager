import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Product } from '../products/entities/product.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';

@WebSocketGateway({ namespace: '/inventory', cors: { origin: '*' } })
export class InventoryGatewayService {
  @WebSocketServer()
  server: Server;

  emitStockUpdated(movement: StockMovement): void {
    // If no websocket connection exists yet, ensure we don't crash the request handler.
    // Previous code:
    // this.server.emit('stock_updated', {
    //   productId: movement.product.id,
    //   movementType: movement.type,
    //   quantity: movement.quantity,
    //   stockAfter: movement.stockAfter,
    //   timestamp: new Date().toISOString(),
    // });
    this.server?.emit('stock_updated', {
      productId: movement.product.id,
      movementType: movement.type,
      quantity: movement.quantity,
      stockAfter: movement.stockAfter,
      timestamp: new Date().toISOString(),
    });
  }

  emitLowStockAlert(product: Product): void {
    // Previous code:
    // this.server.emit('low_stock_alert', {
    //   productId: product.id,
    //   name: product.name,
    //   sku: product.sku,
    //   currentStock: product.stock,
    //   threshold: product.lowStockThreshold,
    //   timestamp: new Date().toISOString(),
    // });
    this.server?.emit('low_stock_alert', {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.stock,
      threshold: product.lowStockThreshold,
      timestamp: new Date().toISOString(),
    });
  }
}
