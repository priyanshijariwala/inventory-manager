import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListProductsQueryDto {
  @ApiPropertyOptional({ description: 'Search by product name or SKU' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({  })
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true'))
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({  minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({  minimum: 1, description: 'Items per page' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  perPage?: number;

  // Backwards-compatible alias; hidden from Swagger in favor of `perPage`.
  @ApiHideProperty()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
