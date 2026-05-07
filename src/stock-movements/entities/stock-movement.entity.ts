import { MovementType } from '../../common/enums/movement-type.enum';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @Column({ type: 'enum', enum: MovementType })
  @Column({ type: 'simple-enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  stockBefore: number;

  @Column({ type: 'int' })
  stockAfter: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  reference: string | null;

  @ManyToOne(() => Product, (product) => product.movements, { onDelete: 'CASCADE' })
  product: Product;

  @ManyToOne(() => User)
  performedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
