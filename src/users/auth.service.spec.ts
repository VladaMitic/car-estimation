import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUserService: Partial<UsersService>;

  beforeEach(async () => {
    const users: User[] = [];

    fakeUserService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUserService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('create new user with salted and hashed password', async () => {
    const user = await service.signup('user@example.com', 'password123');
    expect(user.password).not.toEqual('password123');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throw an error if user email is in use', async () => {
    expect.assertions(1);
    await service.signup('inuse@example.com', 'password123');
    await expect(
      service.signup('inuse@example.com', 'password123'),
    ).rejects.toThrowError(BadRequestException);
  });

  it('throw error is signin is call with unused user email', async () => {
    await expect(
      service.signin('notused@example.com', 'password123'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throw error if invalid password is provided', async () => {
    expect.assertions(1);
    await service.signup('invalidpass@example.com', '1111112');
    await expect(
      service.signin('invalidpass@example.com', '111111'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns user if correnct password is provided', async () => {
    await service.signup('validpass@example.com', '111111');
    const user = await service.signin('validpass@example.com', '111111');
    expect(user).toBeDefined();
  });
});
