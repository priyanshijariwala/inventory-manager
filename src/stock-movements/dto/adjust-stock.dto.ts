import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '../../common/enums/movement-type.enum';

export class AdjustStockDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: MovementType, example: MovementType.RESTOCK })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Initial stock load' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'PO-1024' })
  @IsString()
  @IsOptional()
  reference?: string;
}
