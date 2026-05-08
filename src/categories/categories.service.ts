import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  findAll() {
    return this.categoriesRepo
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .select(['category.id', 'category.name', 'category.slug', 'category.description', 'category.createdAt'])
      .addSelect('COUNT(product.id)', 'productCount')
      .groupBy('category.id')
      .orderBy('category.createdAt', 'DESC')
      .getRawAndEntities()
      .then(({ raw, entities }) =>
        entities.map((category, index) => ({
          ...category,
          productCount: Number(raw[index]?.productCount ?? 0),
        })),
      );
  }

  async create(dto: CreateCategoryDto) {
    const slug = this.slugify(dto.name);
    const existing = await this.categoriesRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    return this.categoriesRepo.save(
      this.categoriesRepo.create({
        name: dto.name,
        slug,
        description: dto.description ?? null,
      }),
    );
  }

  async update(id: string, dto: UpdateCategoryDto) {
     const hasData = Object.values(dto).some(
        value => value !== undefined,
      );
    
      if (!hasData) {
        throw new BadRequestException(
          'At least one field is required for update',
        );
      }
    const category = await this.categoriesRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== category.name) {
      const slug = this.slugify(dto.name);
      const conflict = await this.categoriesRepo.findOne({ where: { slug } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Category slug already exists');
      }
      category.name = dto.name;
      category.slug = slug;
    }

    if (dto.description !== undefined) {
      category.description = dto.description || null;
    }

    return this.categoriesRepo.save(category);
  }

  async delete(id: string): Promise<{ message: string }> {
    const category = await this.categoriesRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.productsRepo.count({ where: { category: { id } } });
    if (productCount > 0) {
      throw new ConflictException('Cannot delete category with assigned products');
    }

    await this.categoriesRepo.delete(id);
    return { message: 'Category deleted' };
  }

  async findOneOrNull(id: string): Promise<Category | null> {
    return this.categoriesRepo.findOne({ where: { id } });
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
