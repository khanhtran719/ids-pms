import { ConflictException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import type { PasswordHasher } from '../../auth/application/auth.ports';
import type { UserManagementRepository } from './user-management.ports';

describe('UserManagementService', () => {
  const users = {
    emailExists: jest.fn(),
    createUser: jest.fn(),
    listUsers: jest.fn(),
  } as unknown as jest.Mocked<UserManagementRepository>;
  const passwords = {
    hash: jest.fn(),
  } as unknown as jest.Mocked<PasswordHasher>;
  const service = new UserManagementService(users, passwords);

  beforeEach(() => jest.clearAllMocks());

  it('creates a normalized user without returning the password hash', async () => {
    users.emailExists.mockResolvedValue(false);
    passwords.hash.mockResolvedValue('argon-hash');
    users.createUser.mockResolvedValue({
      id: 'user-id',
      email: 'member@example.com',
      displayName: 'New Member',
      status: 'active',
      roleCodes: ['member'],
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
    });

    const result = await service.create({
      email: ' MEMBER@EXAMPLE.COM ',
      displayName: '  New Member ',
      password: 'temporary-password-123',
      roleCodes: ['member'],
    });

    expect(users.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'member@example.com',
        displayName: 'New Member',
        passwordHash: 'argon-hash',
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an email that already exists', async () => {
    users.emailExists.mockResolvedValue(true);

    await expect(
      service.create({
        email: 'member@example.com',
        displayName: 'Member',
        password: 'temporary-password-123',
        roleCodes: ['member'],
      }),
    ).rejects.toThrow(ConflictException);
    expect(passwords.hash).not.toHaveBeenCalled();
  });
});
