import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@desi/prisma';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        email: string;
        name?: string;
        passwordHash?: string;
    }) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                passwordHash: data.passwordHash,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async updatePlan(userId: string, plan: Plan) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { plan },
        });
    }

    async incrementDailyUsage(userId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) return;

        // Reset daily usage if it's a new day
        const lastUsageDate = user.lastUsageDate;
        const isNewDay = !lastUsageDate || lastUsageDate < today;

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                dailyUsage: isNewDay ? 1 : { increment: 1 },
                lastUsageDate: new Date(),
            },
        });
    }

    async getDailyUsage(userId: string): Promise<number> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if last usage was today
        const lastUsageDate = user.lastUsageDate;
        if (!lastUsageDate || lastUsageDate < today) {
            return 0;
        }

        return user.dailyUsage;
    }
}
