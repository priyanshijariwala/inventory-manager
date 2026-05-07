import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { StockMovement } from '../stock-movements/entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limitRaw = query.perPage ?? query.limit ?? 10;
    const limit = Math.min(limitRaw, 100);

    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.q) {
      qb.andWhere('(product.name ILIKE :q OR product.sku ILIKE :q)', { q: `%${query.q}%` });
    }
    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.active !== undefined) {
      qb.andWhere('product.active = :active', { active: query.active });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async create(dto: CreateProductDto) {
    const existing = await this.productsRepo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException('SKU already exists');
    }

    const category = dto.categoryId ? await this.resolveCategory(dto.categoryId) : null;
    return this.productsRepo.save(
      this.productsRepo.create({
        ...dto,
        description: dto.description ?? null,
        costInCents: dto.costInCents ?? null,
        stock: dto.stock ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
        category,
      }),
    );
  }

  async findOneWithRecentMovements(id: string) {
    const product = await this.productsRepo.findOne({ where: { id }, relations: { category: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const recentMovements = await this.movementsRepo.find({
      where: { product: { id } },
      relations: { performedBy: true },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return { ...product, recentMovements };
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productsRepo.findOne({ where: { id }, relations: { category: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productsRepo.findOne({ where: { sku: dto.sku } });
      if (existing && existing.id !== id) {
        throw new ConflictException('SKU already exists');
      }
      product.sku = dto.sku;
    }

    if (dto.categoryId !== undefined) {
      product.category = dto.categoryId ? await this.resolveCategory(dto.categoryId) : null;
    }

    Object.assign(product, {
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      priceInCents: dto.priceInCents ?? product.priceInCents,
      costInCents: dto.costInCents ?? product.costInCents,
      stock: dto.stock ?? product.stock,
      lowStockThreshold: dto.lowStockThreshold ?? product.lowStockThreshold,
    });

    return this.productsRepo.save(product);
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.active = false;
    await this.productsRepo.save(product);
    return { message: 'Product deactivated' };
  }

  findLowStock() {
    return this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.active = true')
      .andWhere('product.stock <= product.lowStockThreshold')
      .orderBy('product.stock', 'ASC')
      .getMany();
  }

  private async resolveCategory(categoryId: string): Promise<Category> {
    const category = await this.categoriesRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
