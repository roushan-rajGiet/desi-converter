import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private prisma: PrismaService,
        private jobsService: JobsService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Health check' })
    async check() {
        try {
            // Check database connection
            await this.prisma.$queryRaw`SELECT 1`;
            const dbStatus = 'connected';

            // Check Redis
            const redisHealthy = await this.jobsService.isRedisHealthy();
            const redisStatus = redisHealthy ? 'connected' : 'disconnected';

            const status = dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'error';

            return {
                status,
                timestamp: new Date().toISOString(),
                services: {
                    database: dbStatus,
                    redis: redisStatus,
                },
            };
        } catch (error: any) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'disconnected',
                    redis: 'unknown',
                    error: error.message,
                },
            };
        }
    }
}
