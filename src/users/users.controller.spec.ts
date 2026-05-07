import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { findAll: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns users from service', async () => {
    const expected = [{ id: 'u1', email: 'staff@example.com', role: UserRole.STAFF }];
    usersService.findAll.mockResolvedValue(expected);

    await expect(controller.findAll()).resolves.toEqual(expected);
  });

  it('creates user via service', async () => {
    const dto = { email: 'new@example.com', password: 'secret123', role: UserRole.STAFF };
    const expected = { id: 'u2', email: 'new@example.com', role: UserRole.STAFF };
    usersService.create.mockResolvedValue(expected);

    await expect(controller.create(dto)).resolves.toEqual(expected);
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });
});
