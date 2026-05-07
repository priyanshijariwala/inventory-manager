import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { MovementType } from '../common/enums/movement-type.enum';
import { InventoryGatewayService } from '../inventory-gateway/inventory-gateway.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryGateway: InventoryGatewayService,
  ) {}

  async adjustStock(dto: AdjustStockDto, user: JwtPayload): Promise<StockMovement> {
    const movement = await this.dataSource.transaction(async (manager) => {
      // Previous code (always used pessimistic lock; this breaks on SQLite):
      // const product = await manager
      //   .getRepository(Product)
      //   .createQueryBuilder('p')
      //   .setLock('pessimistic_write')
      //   .where('p.id = :id', { id: dto.productId })
      //   .getOne();

      const qb = manager
        .getRepository(Product)
        .createQueryBuilder('p')
        .where('p.id = :id', { id: dto.productId })
      // SQLite doesn't support pessimistic row locks; only apply locks on DBs that do.
      if (this.dataSource.options.type !== 'postgres' && this.dataSource.options.type !== 'sqlite') {
        qb.setLock('pessimistic_write');
      }

      const product = await qb.getOne();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const delta = [MovementType.SALE, MovementType.DAMAGE].includes(dto.type) ? -dto.quantity : dto.quantity;
      const stockBefore = product.stock;
      const stockAfter = stockBefore + delta;

      if (stockAfter < 0) {
        throw new UnprocessableEntityException('Insufficient stock');
      }

      product.stock = stockAfter;
      await manager.save(product);

      const performer = await manager.getRepository(User).findOne({ where: { id: user.sub } });
      if (!performer) {
        throw new NotFoundException('User not found');
      }

      const movementEntity = manager.getRepository(StockMovement).create({
        type: dto.type,
        quantity: delta,
        stockBefore,
        stockAfter,
        reason: dto.reason ?? null,
        reference: dto.reference ?? null,
        product,
        performedBy: performer,
      });
      return manager.save(movementEntity);
    });

    const fullMovement = await this.movementsRepo.findOneOrFail({
      where: { id: movement.id },
      relations: { product: true, performedBy: true },
    });
    this.inventoryGateway.emitStockUpdated(fullMovement);
    if (fullMovement.stockAfter <= fullMovement.product.lowStockThreshold) {
      this.inventoryGateway.emitLowStockAlert(fullMovement.product);
    }

    return fullMovement;
  }

  async findAll(query: ListStockMovementsQueryDto) {
    const page = query.page ?? 1;
    const limitRaw = query.perPage ?? query.limit ?? 20;
    const limit = Math.min(limitRaw, 100);
    const qb = this.movementsRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.performedBy', 'performedBy')
      .orderBy('movement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.productId) {
      qb.andWhere('product.id = :productId', { productId: query.productId });
    }
    if (query.type) {
      qb.andWhere('movement.type = :type', { type: query.type });
    }
    if (query.startDate) {
      qb.andWhere('movement.createdAt >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('movement.createdAt <= :endDate', { endDate: query.endDate });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  findByProduct(productId: string) {
    return this.movementsRepo.find({
      where: { product: { id: productId } },
      relations: { performedBy: true, product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getReport(startDate?: string, endDate?: string) {
    const qb = this.movementsRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .select('movement.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ABS(movement.quantity))', 'totalQuantity')
      .groupBy('movement.type');

    if (startDate) {
      qb.andWhere('movement.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('movement.createdAt <= :endDate', { endDate });
    }

    const rows = await qb.getRawMany<{ type: MovementType; count: string; totalQuantity: string }>();
    const totals = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .select('SUM(product.stock)', 'totalProducts')
      .addSelect('SUM(product.stock * product.priceInCents)', 'totalInventoryValue')
      .where('product.active = true')
      .getRawOne<{ totalProducts: string | null; totalInventoryValue: string | null }>();

    const movementStats = Object.values(MovementType).reduce<Record<string, { count: number; totalQuantity: number }>>(
      (acc, type) => {
        const row = rows.find((item) => item.type === type);
        acc[type] = { count: Number(row?.count ?? 0), totalQuantity: Number(row?.totalQuantity ?? 0) };
        return acc;
      },
      {},
    );

    return {
      period: { startDate: startDate ?? null, endDate: endDate ?? null },
      totalProducts: Number(totals?.totalProducts ?? 0),
      totalInventoryValue: Number(totals?.totalInventoryValue ?? 0),
      movements: movementStats,
    };
  }
}
