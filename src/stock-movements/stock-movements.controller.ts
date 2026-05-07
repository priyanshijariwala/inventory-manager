import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto';
import { StockMovementsService } from './stock-movements.service';
import { ApiBearerAuth } from '@nestjs/swagger';


@Controller('stock-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @ApiBearerAuth()
  @Get()
  findAll(@Query() query: ListStockMovementsQueryDto) {
    return this.stockMovementsService.findAll(query);
  }

  @ApiBearerAuth()
  @Post()
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: JwtPayload) {
    return this.stockMovementsService.adjustStock(dto, user);
  }

  @ApiBearerAuth()
  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.stockMovementsService.findByProduct(productId);
  }

  @ApiBearerAuth()
  @Get('report')
  @Roles(UserRole.MANAGER)
  report(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.stockMovementsService.getReport(startDate, endDate);
  }
}
