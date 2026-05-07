import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    categoriesService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: categoriesService }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns categories via service', async () => {
    const expected = [{ id: 'c1', name: 'Electronics' }];
    categoriesService.findAll.mockResolvedValue(expected);
    await expect(controller.findAll()).resolves.toEqual(expected);
  });

  it('creates category via service', async () => {
    const dto = { name: 'Books', description: 'All books' };
    categoriesService.create.mockResolvedValue({ id: 'c2', ...dto });
    await expect(controller.create(dto)).resolves.toEqual({ id: 'c2', ...dto });
  });

  it('updates category via service', async () => {
    categoriesService.update.mockResolvedValue({ id: 'c1', name: 'Updated' });
    await expect(controller.update('c1', { name: 'Updated' })).resolves.toEqual({ id: 'c1', name: 'Updated' });
  });

  it('deletes category via service', async () => {
    categoriesService.delete.mockResolvedValue({ message: 'Category deleted' });
    await expect(controller.remove('c1')).resolves.toEqual({ message: 'Category deleted' });
  });
});
