import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.login({ email: 'missing@example.com', password: 'secret123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when password is invalid', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
      role: UserRole.MANAGER,
      passwordHash: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'manager@example.com', password: 'wrong123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns access token and user payload for valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
      role: UserRole.MANAGER,
      passwordHash: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(service.login({ email: 'manager@example.com', password: 'manager123' })).resolves.toEqual({
      accessToken: 'signed-token',
      user: { id: 'u1', email: 'manager@example.com', role: UserRole.MANAGER },
    });
  });
});
