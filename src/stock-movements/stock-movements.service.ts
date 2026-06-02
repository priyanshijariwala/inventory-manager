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
import { Workbook } from 'exceljs';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement) private readonly movementsRepo: Repository<StockMovement>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryGateway: InventoryGatewayService,
  ) {}

  async adjustStock(dto: AdjustStockDto, user: JwtPayload): Promise<StockMovement> {
    const movement = await this.dataSource.transaction(async (manager) => {
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
      if (this.dataSource.options.type !== 'sqlite') {
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

  private buildFilteredQuery(query: ListStockMovementsQueryDto) {
    const qb = this.movementsRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.performedBy', 'performedBy')
      .orderBy('movement.createdAt', 'DESC');

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

    return qb;
  }

  async exportStockMovementsToExcel(query: ListStockMovementsQueryDto) {
    const movements = await this.buildFilteredQuery(query).getMany();
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Stock Movements');

    worksheet.columns = [
      { header: 'Date', key: 'createdAt', width: 24 },
      { header: 'Product', key: 'productName', width: 25 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Stock Before', key: 'stockBefore', width: 14 },
      { header: 'Stock After', key: 'stockAfter', width: 14 },
      { header: 'Reason', key: 'reason', width: 24 },
      { header: 'Reference', key: 'reference', width: 18 },
      { header: 'Performed By', key: 'performedBy', width: 24 },
    ];

    movements.forEach((movement) => {
      worksheet.addRow({
        createdAt: movement.createdAt?.toISOString() ?? '',
        productName: movement.product?.name ?? '',
        sku: movement.product?.sku ?? '',
        type: movement.type,
        quantity: movement.quantity,
        stockBefore: movement.stockBefore,
        stockAfter: movement.stockAfter,
        reason: movement.reason ?? '',
        reference: movement.reference ?? '',
        performedBy: movement.performedBy?.email ?? '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportStockMovementsToPdf(query: ListStockMovementsQueryDto) {
    const movements = await this.buildFilteredQuery(query).getMany();
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    const headers = [
      { title: 'Date', width: 70 },
      { title: 'Product', width: 100 },
      { title: 'SKU', width: 50 },
      { title: 'Type', width: 50 },
      { title: 'Qty', width: 35 },
      { title: 'Before', width: 40 },
      { title: 'After', width: 40 },
      { title: 'Performed By', width: 90 },
    ];

    const formatDate = (date?: Date | string) => {
      if (!date) return '';
      const parsed = date instanceof Date ? date : new Date(date);
      return parsed.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    let y = 40;
    const margin = 40;
    const rowHeight = 18;

    const drawHeader = () => {
      y += 10;
      doc.fontSize(18).font('Helvetica-Bold').text('Stock Movements', margin, y);
      y += 24;
      doc.fontSize(10).font('Helvetica-Bold');
      let x = margin;
      headers.forEach((column) => {
        doc.text(column.title, x, y, { width: column.width, continued: false });
        x += column.width;
      });
      y += 16;
      doc.moveTo(margin, y - 4).lineTo(doc.page.width - margin, y - 4).stroke();
    };

    const addRow = (movement: StockMovement) => {
      if (y + rowHeight * 3 > doc.page.height - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
      }

      const rowValues = [
        formatDate(movement.createdAt),
        movement.product?.name ?? '',
        movement.product?.sku ?? '',
        movement.type,
        movement.quantity.toString(),
        movement.stockBefore.toString(),
        movement.stockAfter.toString(),
        movement.performedBy?.email ?? '',
      ];
      let x = margin;
      doc.fontSize(9).font('Helvetica');
      rowValues.forEach((value, index) => {
        doc.text(value, x, y, { width: headers[index].width, ellipsis: true });
        x += headers[index].width;
      });
      y += rowHeight;

      const notes = [movement.reason, movement.reference].filter(Boolean).join(' | ');
      if (notes) {
        doc.fontSize(8).fillColor('#555');
        doc.text(`Notes: ${notes}`, margin, y, { width: doc.page.width - margin * 2 });
        y += 14;
        doc.fillColor('black');
      }
    };

    doc.pipe(stream);
    drawHeader();

    if (movements.length === 0) {
      y += 10;
      doc.fontSize(10).text('No stock movement records available for the selected filter.', margin, y);
    } else {
      movements.forEach(addRow);
    }

    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
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
