import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Mechanical Keyboard' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'KEYB-001' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9-]+$/, { message: 'SKU must be uppercase letters, numbers, and hyphens only' })
  sku: string;

  @ApiPropertyOptional({ example: 'Hot-swappable wireless keyboard' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 4999, minimum: 0 })
  @IsInt()
  @Min(0)
  priceInCents: number;

  @ApiPropertyOptional({ example: 3200, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  costInCents?: number;

  @ApiPropertyOptional({ example: 25, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Example Category' })
  @IsString()
  @IsOptional()
  categoryName?: string;
}
