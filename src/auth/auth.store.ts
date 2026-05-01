import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from './enums/user-role.enum';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
};

type UserSession = {
  refreshTokenHash: string;
  refreshTokenExpiresAt: string;
  accessTokenExpiresAt: string;
  updatedAt: string;
};

@Injectable()
export class AuthStore {
  // Primeiro dicionario: usuarios.
  private readonly usersById = new Map<string, StoredUser>();
  private readonly userIdByEmail = new Map<string, string>();

  // Segundo dicionario: sessoes/tokens por usuario.
  private readonly sessionsByUserId = new Map<string, UserSession>();

  createUser(input: {
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
  }): StoredUser {
    const id = randomUUID();
    const normalizedEmail = input.email.toLowerCase();

    const created: StoredUser = {
      id,
      name: input.name,
      email: normalizedEmail,
      role: input.role,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.usersById.set(id, created);
    this.userIdByEmail.set(normalizedEmail, id);

    return created;
  }

  findUserByEmail(email: string): StoredUser | null {
    const normalizedEmail = email.toLowerCase();
    const userId = this.userIdByEmail.get(normalizedEmail);

    if (!userId) {
      return null;
    }

    return this.usersById.get(userId) ?? null;
  }

  findUserById(id: string): StoredUser | null {
    return this.usersById.get(id) ?? null;
  }

  saveSession(
    userId: string,
    data: {
      refreshTokenHash: string;
      refreshTokenExpiresAt: string;
      accessTokenExpiresAt: string;
    },
  ): void {
    this.sessionsByUserId.set(userId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  getSession(userId: string): UserSession | null {
    return this.sessionsByUserId.get(userId) ?? null;
  }

  clearSession(userId: string): void {
    this.sessionsByUserId.delete(userId);
  }

  countUsers(): number {
    return this.usersById.size;
  }
}
