import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: {
    findLowStock: jest.Mock;
    findAll: jest.Mock;
    findOneWithRecentMovements: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };

  beforeEach(async () => {
    productsService = {
      findLowStock: jest.fn(),
      findAll: jest.fn(),
      findOneWithRecentMovements: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service', async () => {
    const query = { page: 1, perPage: 10 };
    const expected = { items: [], total: 0, page: 1, limit: 10 };
    productsService.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(query)).resolves.toEqual(expected);
  });

  it('findOne delegates to service', async () => {
    productsService.findOneWithRecentMovements.mockResolvedValue({ id: 'p1' });
    await expect(controller.findOne('p1')).resolves.toEqual({ id: 'p1' });
  });

  it('create delegates to service', async () => {
    const dto = { name: 'Mouse', sku: 'MOUSE-1', priceInCents: 999 };
    productsService.create.mockResolvedValue({ id: 'p1', ...dto });
    await expect(controller.create(dto as never)).resolves.toEqual({ id: 'p1', ...dto });
  });
});
