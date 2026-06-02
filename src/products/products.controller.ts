import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiBearerAuth()
  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  @ApiBearerAuth()
  @Get('import/sample')
  @Roles(UserRole.MANAGER)
  async downloadImportSample(@Res() res: Response) {
    const buffer = await this.productsService.createImportSampleWorkbook();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-import-sample.xlsx"',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @ApiBearerAuth()
  @Post('import')
  @Roles(UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: any) {
    return this.productsService.importProductsFromExcel(file);
  }

  @ApiBearerAuth()
  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOneWithRecentMovements(id);
  }

  @ApiBearerAuth()
  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Roles(UserRole.MANAGER)
  patch(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  @Roles(UserRole.MANAGER)
  put(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Roles(UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
