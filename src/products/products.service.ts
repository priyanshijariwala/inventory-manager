import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { Workbook } from 'exceljs';
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
    const search = (query.q ?? query.search)?.trim();

    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('(LOWER(product.name) LIKE :q OR LOWER(product.sku) LIKE :q)', {
        q: `%${search.toLowerCase()}%`,
      });
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

  async create(dto: CreateProductDto & { categoryName?: string }) {
    const existing = await this.productsRepo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException('SKU already exists');
    }

    const category = dto.categoryId || dto.categoryName
      ? await this.resolveImportCategory(dto.categoryId, dto.categoryName)
      : null;

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

    const hasData = Object.values(dto).some(
      value => value !== undefined,
    );

    if (!hasData) {
      throw new BadRequestException(
        'At least one field is required for update',
      );
    }
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

    if (dto.categoryId !== undefined || dto['categoryName'] !== undefined) {
      product.category = await this.resolveImportCategory(dto.categoryId, dto['categoryName']);
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

  async createImportSampleWorkbook() {
    const categories = await this.categoriesRepo.find({ order: { name: 'ASC' } });
    const categoryNames = categories.map(category => category.name).filter(Boolean);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Product Import');
    const categoriesSheet = workbook.addWorksheet('Categories');

    categoriesSheet.state = 'hidden';
    categoriesSheet.addRow(['Category Name']);
    categoryNames.forEach(name => categoriesSheet.addRow([name]));

    worksheet.addRow([
      'sku',
      'name',
      'description',
      'categoryName',
      'price',
      'quantity',
    ]);

    const sampleCategoryName = categoryNames[0] ?? 'Example Category';
    worksheet.addRow([
      'SAMPLE-SKU-001',
      'Sample Product',
      'Use this row as an example',
      sampleCategoryName,
      19.99,
      10,
    ]);

    worksheet.columns?.forEach(column => {
      if (column.width === undefined) {
        column.width = 20;
      }
    });

    if (categoryNames.length > 0) {
      const lastCategoryRow = categoryNames.length + 1;
      const validationFormula = `=Categories!$A$2:$A$${lastCategoryRow}`;
      for (let rowIndex = 2; rowIndex <= 1000; rowIndex++) {
        worksheet.getCell(`D${rowIndex}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [validationFormula],
          showErrorMessage: true,
          errorStyle: 'information',
          errorTitle: 'Invalid category',
          error: 'Please select a category from the dropdown list.',
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importProductsFromExcel(file: any) {
    if (!file || file.size === 0) {
      throw new BadRequestException('Excel file is required');
    }

    const buffer = file.buffer
      ? file.buffer
      : file.path
      ? await fs.readFile(file.path)
      : null;

    if (!buffer) {
      throw new BadRequestException('Unable to read uploaded Excel file');
    }

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel sheet is empty');
    }

    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const normalized = String(cell.value ?? '').trim().toLowerCase().replace(/\s+/g, '');
      if (normalized) {
        headerMap[normalized] = colNumber;
      }
    });

    const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, '');
    const findCol = (names: string[]) => names
      .map(name => normalizeKey(name))
      .find(name => headerMap[name] !== undefined);

    const getValue = (row: any, keys: string[]) => {
      const colName = findCol(keys);
      return colName ? row.getCell(headerMap[colName]).value : undefined;
    };

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const sku = getValue(row, ['sku']);
      if (!sku) {
        skippedCount++;
        continue;
      }

      const productData: any = {
        sku: String(sku).trim(),
        name: String(getValue(row, ['name']) ?? '').trim() || undefined,
        description: String(getValue(row, ['description']) ?? '').trim() || undefined,
        stock: this.parseInteger(getValue(row, ['quantity', 'stock']), 0),
        priceInCents: undefined,
      };

      const priceValue = getValue(row, ['price', 'priceincents']);
      if (priceValue !== undefined) {
        const priceInCents = this.parseDecimalToCents(priceValue);
        if (priceInCents !== undefined) {
          productData.priceInCents = priceInCents;
        }
      }

      const categoryIdValue = getValue(row, ['categoryid']);
      const categoryNameValue = getValue(row, ['categoryname']);
      if (categoryIdValue || categoryNameValue) {
        productData.categoryId = categoryIdValue ? String(categoryIdValue).trim() : undefined;
        productData.categoryName = categoryNameValue ? String(categoryNameValue).trim() : undefined;
      }

      const existing = await this.productsRepo.findOne({ where: { sku: productData.sku }, relations: { category: true } });
      if (existing) {
        const updateDto: any = {
          name: productData.name,
          description: productData.description,
          priceInCents: productData.priceInCents,
          costInCents: productData.costInCents,
          stock: productData.stock,
          lowStockThreshold: productData.lowStockThreshold,
          active: productData.active,
        };

        if (productData.categoryId !== undefined || productData.categoryName !== undefined) {
          updateDto.categoryId = productData.categoryId;
          updateDto.categoryName = productData.categoryName;
        }

        await this.update(existing.id, updateDto);
        updatedCount++;
      } else {
        const createDto: any = {
          sku: productData.sku,
          name: productData.name || 'Untitled Product',
          description: productData.description,
          priceInCents: productData.priceInCents ?? 0,
          costInCents: productData.costInCents,
          stock: productData.stock,
          lowStockThreshold: productData.lowStockThreshold,
          active: productData.active,
          categoryId: productData.categoryId,
          categoryName: productData.categoryName,
        };

        await this.create(createDto);
        createdCount++;
      }
    }

    return {
      imported: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
    };
  }

  private parseInteger(value: unknown, defaultValue: number | undefined): number | undefined {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.trunc(numberValue) : defaultValue;
  }

  private parseDecimalToCents(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return undefined;
    }
    return Math.round(numberValue * 100);
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const normalized = String(value).trim().toLowerCase();
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    return fallback;
  }

  private async resolveImportCategory(categoryId?: string, categoryName?: string): Promise<Category | null> {
    if (categoryId) {
      return this.resolveCategory(categoryId);
    }
    if (categoryName) {
      return this.findOrCreateCategoryByName(categoryName);
    }
    return null;
  }

  private async findOrCreateCategoryByName(categoryName: string): Promise<Category> {
    const normalizedName = categoryName.trim();
    let category = await this.categoriesRepo.findOne({ where: { name: normalizedName } });
    if (category) {
      return category;
    }

    const baseSlug = this.slugify(normalizedName);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.categoriesRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    category = this.categoriesRepo.create({ name: normalizedName, slug });
    return this.categoriesRepo.save(category);
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async resolveCategory(categoryId: string): Promise<Category> {
    const category = await this.categoriesRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(`Category not found for id '${categoryId}'. Use a valid categoryId or provide categoryName.`);
    }
    return category;
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
}
