import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { MovementType } from '../common/enums/movement-type.enum';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let stockMovementsService: {
    findAll: jest.Mock;
    adjustStock: jest.Mock;
    findByProduct: jest.Mock;
    getReport: jest.Mock;
  };

  beforeEach(async () => {
    stockMovementsService = {
      findAll: jest.fn(),
      adjustStock: jest.fn(),
      findByProduct: jest.fn(),
      getReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [{ provide: StockMovementsService, useValue: stockMovementsService }],
    }).compile();

    controller = module.get<StockMovementsController>(StockMovementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service', async () => {
    stockMovementsService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    await expect(controller.findAll({ page: 1 })).resolves.toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('adjustStock delegates to service', async () => {
    const dto = { productId: 'p1', type: MovementType.RESTOCK, quantity: 5 };
    const user = { sub: 'u1', email: 'staff@example.com', role: 'staff' };
    stockMovementsService.adjustStock.mockResolvedValue({ id: 'm1' });
    await expect(controller.adjustStock(dto as never, user as never)).resolves.toEqual({ id: 'm1' });
  });
});
