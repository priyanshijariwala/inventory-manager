import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates user with lowercase email and hashed password', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const created = await service.create({
      email: 'USER@Example.com',
      password: 'secret123',
      role: UserRole.STAFF,
    });

    expect(usersRepo.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: UserRole.STAFF,
    });
    expect(created).toEqual({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: UserRole.STAFF,
    });
  });

  it('throws conflict if email already exists', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1' });

    await expect(
      service.create({ email: 'user@example.com', password: 'secret123', role: UserRole.STAFF }),
    ).rejects.toThrow(ConflictException);
  });

  it('findAll returns repository result', async () => {
    usersRepo.find.mockResolvedValue([{ id: 'u1', email: 'staff@example.com' }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 'u1', email: 'staff@example.com' }]);
  });

  it('findByEmail lowercases lookup', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u1', email: 'staff@example.com' });
    await service.findByEmail('STAFF@EXAMPLE.COM');
    expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'staff@example.com' } });
  });
});
