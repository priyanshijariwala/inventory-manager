import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultUser('manager@example.com', 'manager123', UserRole.MANAGER);
    await this.ensureDefaultUser('staff@example.com', 'staff123', UserRole.STAFF);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
      }),
    );
  }

  findAll(): Promise<User[]> {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
      select: { id: true, email: true, role: true, createdAt: true, passwordHash: false },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  private async ensureDefaultUser(email: string, password: string, role: UserRole): Promise<void> {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.usersRepo.save(this.usersRepo.create({ email, passwordHash, role }));
  }
}
