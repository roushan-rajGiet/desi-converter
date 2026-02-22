import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS, ENTERPRISE_TIER_LIMITS } from '@desi/shared';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    async getProfile(@Req() req: any) {
        const user = await this.usersService.findById(req.user.id);
        const dailyUsage = await this.usersService.getDailyUsage(req.user.id);

        const limits = user?.plan === 'ENTERPRISE'
            ? ENTERPRISE_TIER_LIMITS
            : user?.plan === 'PREMIUM'
                ? PREMIUM_TIER_LIMITS
                : FREE_TIER_LIMITS;

        return {
            ...user,
            passwordHash: undefined,
            usage: {
                today: dailyUsage,
                limit: limits.maxFilesPerDay,
                remaining: Math.max(0, limits.maxFilesPerDay - dailyUsage),
            },
            limits,
        };
    }
}
