import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async startSession(telegramId: bigint): Promise<{ success: boolean; message: string }> {
    await this.prisma.telegramSession.upsert({
      where: { telegramId },
      update: { state: 'ACTIVE' },
      create: { telegramId, state: 'ACTIVE' },
    });

    return {
      success: true,
      message: `✅ ¡Bienvenido a InfoBot de Informática UMSA!\n\nPuedes consultar:\n• _¿Qué materias hay?_\n• _¿Qué docentes dictan?_\n• _¿Cuáles son los horarios de Intro a la Informática?_`,
    };
  }

  async getSession(telegramId: bigint) {
    return await this.prisma.telegramSession.findUnique({
      where: { telegramId },
    });
  }

  async logout(telegramId: bigint): Promise<void> {
    await this.prisma.telegramSession.deleteMany({
      where: { telegramId },
    });
  }
}
