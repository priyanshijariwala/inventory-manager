import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let categoriesRepo: { findOne: jest.Mock };
  let movementsRepo: { find: jest.Mock };

  beforeEach(async () => {
    productsRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
      createQueryBuilder: jest.fn(),
    };
    categoriesRepo = {
      findOne: jest.fn(),
    };
    movementsRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
        { provide: getRepositoryToken(StockMovement), useValue: movementsRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws conflict when SKU already exists', async () => {
    productsRepo.findOne.mockResolvedValue({ id: 'p1' });
    await expect(service.create({ name: 'A', sku: 'SKU-1', priceInCents: 1000 })).rejects.toThrow(ConflictException);
  });

  it('creates product with defaults', async () => {
    productsRepo.findOne.mockResolvedValue(null);
    await service.create({ name: 'A', sku: 'SKU-1', priceInCents: 1000 });
    expect(productsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stock: 0,
        lowStockThreshold: 5,
      }),
    );
  });

  it('throws not found when product does not exist', async () => {
    productsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneWithRecentMovements('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns product with recent movements', async () => {
    productsRepo.findOne.mockResolvedValue({ id: 'p1', name: 'A' });
    movementsRepo.find.mockResolvedValue([{ id: 'm1' }]);
    await expect(service.findOneWithRecentMovements('p1')).resolves.toEqual({
      id: 'p1',
      name: 'A',
      recentMovements: [{ id: 'm1' }],
    });
  });
});
