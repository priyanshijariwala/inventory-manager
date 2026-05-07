import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StockMovementsService } from './stock-movements.service';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryGatewayService } from '../inventory-gateway/inventory-gateway.service';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { MovementType } from '../common/enums/movement-type.enum';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let movementsRepo: { findOneOrFail: jest.Mock; createQueryBuilder: jest.Mock; find: jest.Mock };
  let dataSource: { options: { type: string }; transaction: jest.Mock };
  let inventoryGateway: { emitStockUpdated: jest.Mock; emitLowStockAlert: jest.Mock };

  beforeEach(async () => {
    movementsRepo = {
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    dataSource = {
      options: { type: 'sqlite' },
      transaction: jest.fn(),
    };
    inventoryGateway = {
      emitStockUpdated: jest.fn(),
      emitLowStockAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: getRepositoryToken(StockMovement), useValue: movementsRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: InventoryGatewayService, useValue: inventoryGateway },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when product is missing in transaction', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => qb) })),
    };
    dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<unknown>) => fn(manager));

    await expect(
      service.adjustStock({ productId: 'missing', type: MovementType.RESTOCK, quantity: 5 }, { sub: 'u1' } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('findByProduct delegates to repository', async () => {
    movementsRepo.find.mockResolvedValue([{ id: 'm1' }]);
    await expect(service.findByProduct('p1')).resolves.toEqual([{ id: 'm1' }]);
  });
});
