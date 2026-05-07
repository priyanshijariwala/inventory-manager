import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let productsRepo: { count: jest.Mock };

  beforeEach(async () => {
    categoriesRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
      delete: jest.fn(),
    };
    productsRepo = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates category with slug', async () => {
    categoriesRepo.findOne.mockResolvedValue(null);
    await service.create({ name: 'Home Appliances', description: 'desc' });
    expect(categoriesRepo.create).toHaveBeenCalledWith({
      name: 'Home Appliances',
      slug: 'home-appliances',
      description: 'desc',
    });
  });

  it('throws conflict when slug already exists', async () => {
    categoriesRepo.findOne.mockResolvedValue({ id: 'c1' });
    await expect(service.create({ name: 'Home Appliances' })).rejects.toThrow(ConflictException);
  });

  it('throws not found when updating missing category', async () => {
    categoriesRepo.findOne.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'New' })).rejects.toThrow(NotFoundException);
  });

  it('throws conflict when deleting category with products', async () => {
    categoriesRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Category' });
    productsRepo.count.mockResolvedValue(2);
    await expect(service.delete('c1')).rejects.toThrow(ConflictException);
  });
});
