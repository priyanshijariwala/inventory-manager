import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  // @Column({ type: 'enum', enum: UserRole })
  @Column({ type: 'simple-enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  profileImage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
